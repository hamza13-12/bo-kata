import { PerspectiveCamera, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import type { AudioEngine } from '../audio/AudioEngine';
import {
  CAMERA,
  FIREWORKS,
  JUICE,
  KITE_PHYSICS,
  PECHA,
  PLAYER,
  RIVALS,
  TIME_OF_DAY,
} from '../config';
import { polylineDistance } from '../core/geometry';
import { followAmount, nextPixelRatio, verticalFov } from '../core/viewport';
import type { Rng } from '../core/rng';
import { pick, range } from '../core/rng';
import type { Difficulty } from '../fight/difficulty';
import { difficultyFor } from '../fight/difficulty';
import { isHooked, pechaDamage, sawSpeed } from '../fight/pecha';
import { Rival } from '../fight/Rival';
import { Fireworks } from '../fx/Fireworks';
import type { Controls } from '../input/Controls';
import { Kite } from '../kite/Kite';
import { aimOnLine, windAt } from '../kite/physics';
import type { Hud } from '../ui/Hud';
import { RivalLabel } from '../ui/Hud';
import { nightFor } from '../world/timeOfDay';
import { World } from '../world/World';
import { saveBest } from './storage';

/**
 * intro   – title screen, your kite flies itself
 * playing – you fly and fight
 * lost    – your kite is falling; game over screen shows shortly
 * over    – game over screen is up
 */
export type Phase = 'intro' | 'playing' | 'lost' | 'over';

const GAME_OVER_DELAY = 2.5;
const LABEL_LIFT = 3.2;
/** Keeps off-screen rival arrows clear of the screen edge (px). */
const EDGE_MARGIN = 28;
/** Pointer aiming always uses a landscape frame, so a phone reaches as much sky as a laptop. */
const AIM_ASPECT = 16 / 9;
/** Seconds between frame-rate checks for dynamic resolution. */
const FPS_WINDOW = 2;

export interface GameDeps {
  readonly canvas: HTMLCanvasElement;
  readonly hud: Hud;
  readonly audio: AudioEngine;
  readonly controls: Controls;
  readonly rng: Rng;
  readonly best: number;
  readonly reduceMotion: boolean;
  /** Phones and tablets: cap resolution and skip antialiasing on dense screens. */
  readonly lowPower: boolean;
  /** Told whenever the game moves between title, play and game over. */
  readonly onPhaseChange?: (phase: Phase) => void;
}

export class Game {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  /** Never moves: turns the pointer into a sky target without camera feedback. */
  private readonly aimCamera: PerspectiveCamera;
  private readonly world: World;
  private readonly hud: Hud;
  private readonly audio: AudioEngine;
  private readonly controls: Controls;
  private readonly rng: Rng;
  private readonly reduceMotion: boolean;
  private readonly onPhaseChange: ((phase: Phase) => void) | undefined;
  private readonly fireworks = new Fireworks();

  private player: Kite;
  private rivals: Rival[] = [];
  private readonly labels = new Map<Rival, RivalLabel>();

  private phase: Phase = 'intro';
  private cuts = 0;
  private best: number;
  private newBest = false;
  /** Your dor's health in a pecha: 1 = fresh, 0 = cut. */
  private lineHealth = 1;
  private spawnTimer = 0;
  private lostTimer = 0;
  private lostTo: { reason: 'cut' | 'crash'; by?: string } = { reason: 'crash' };
  private elapsed = 0;
  private lastFrame = 0;
  /** Seconds of play this round: drives sunset into night. */
  private roundTime = 0;
  private night = 0;
  private ambientFireworkTimer = 0;
  /** Real seconds of slow motion left after a cut. */
  private slowMo = 0;
  private shake = 0;

  private readonly cameraHome = new Vector3(...CAMERA.position);
  private readonly lookHome = new Vector3(...CAMERA.baseLook);
  private readonly look = new Vector3();
  private readonly aim = new Vector3();
  private readonly autopilot = new Vector2();
  private readonly ray = new Raycaster();
  private readonly projected = new Vector3();
  private readonly fxPoint = new Vector3();
  private follow: number = CAMERA.followKite;
  private readonly minPixelRatio: number;
  private pixelRatio: number;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(deps: GameDeps) {
    this.hud = deps.hud;
    this.audio = deps.audio;
    this.controls = deps.controls;
    this.rng = deps.rng;
    this.best = deps.best;
    this.reduceMotion = deps.reduceMotion;
    this.onPhaseChange = deps.onPhaseChange;

    // Phone screens are dense enough that antialiasing costs more than it shows.
    const dpr = window.devicePixelRatio || 1;
    this.renderer = new WebGLRenderer({
      canvas: deps.canvas,
      antialias: !(deps.lowPower && dpr >= 2),
      powerPreference: 'high-performance',
    });
    this.pixelRatio = Math.min(dpr, deps.lowPower ? 1.5 : 2);
    this.minPixelRatio = Math.min(this.pixelRatio, 1);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);

    this.camera = new PerspectiveCamera(
      CAMERA.fov,
      innerWidth / innerHeight,
      CAMERA.near,
      CAMERA.far,
    );
    this.camera.position.copy(this.cameraHome);
    this.camera.lookAt(this.lookHome);
    this.aimCamera = new PerspectiveCamera(CAMERA.fov, AIM_ASPECT, CAMERA.near, CAMERA.far);
    this.aimCamera.position.copy(this.cameraHome);
    this.aimCamera.lookAt(this.lookHome);
    this.aimCamera.updateMatrixWorld();
    this.fitCamera();

    this.world = new World(this.scene, this.rng);
    this.player = this.createPlayerKite();
    this.scene.add(this.fireworks.group);

    addEventListener('resize', this.onResize);
  }

  start(): void {
    this.lastFrame = performance.now();
    this.renderer.setAnimationLoop(this.frame);
  }

  /** Read-only snapshot for manual playtesting from the dev console. */
  debugState(): object {
    const player = this.player.body;
    return {
      phase: this.phase,
      cuts: this.cuts,
      lineHealth: +this.lineHealth.toFixed(3),
      player: {
        pos: player.position.toArray().map((n) => Math.round(n)),
        line: Math.round(player.lineLength),
        saw: +sawSpeed(player).toFixed(2),
        floorTime: +player.floorTime.toFixed(2),
      },
      rivals: this.rivals.map((r) => ({
        name: r.name,
        personality: r.brain.personality,
        attacking: r.brain.attacking,
        flying: r.kite.isFlying,
        hooked: r.hooked,
        health: +r.health.toFixed(3),
        pos: r.kite.body.position.toArray().map((n) => Math.round(n)),
        line: Math.round(r.kite.body.lineLength),
        saw: +sawSpeed(r.kite.body).toFixed(2),
        gap: this.player.isFlying
          ? +polylineDistance(
              this.player.string.points,
              r.kite.string.points,
              PECHA.ignoreNearAnchor,
              PECHA.ignoreNearAnchor,
            ).distance.toFixed(2)
          : null,
      })),
    };
  }

  /** From the title screen: take control of the kite already in the sky. */
  play(): void {
    this.resetRound();
  }

  /** From the game over screen: a fresh kite and a clear sky. */
  restart(): void {
    this.player.dispose();
    this.player = this.createPlayerKite();
    for (const rival of this.rivals) this.removeRival(rival);
    this.rivals = [];
    this.resetRound();
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.onPhaseChange?.(phase);
  }

  private resetRound(): void {
    this.setPhase('playing');
    this.cuts = 0;
    this.roundTime = 0;
    this.newBest = false;
    this.lineHealth = 1;
    this.spawnTimer = RIVALS.firstSpawnDelay;
    this.controls.enabled = true;
    this.hud.showPlaying();
  }

  private createPlayerKite(): Kite {
    return new Kite(this.scene, {
      anchor: new Vector3(...PLAYER.anchor),
      start: new Vector3(...PLAYER.start),
      lineLength: PLAYER.startLine,
      colors: PLAYER.colors,
      scale: PLAYER.scale,
      stringColor: PLAYER.stringColor,
      stringSegments: PLAYER.stringSegments,
    });
  }

  private readonly frame = (now: number): void => {
    // Clamped both ways: long stalls (tab switches) and out-of-order timestamps.
    const frameSeconds = (now - this.lastFrame) / 1000;
    const realDt = Math.min(Math.max(frameSeconds, 0), 0.05);
    this.lastFrame = now;
    this.trackFrameRate(frameSeconds);
    this.slowMo = Math.max(0, this.slowMo - realDt);
    this.shake *= Math.exp(-JUICE.shakeDecay * realDt);
    const dt = realDt * (this.slowMo > 0 ? JUICE.slowMoScale : 1);
    this.elapsed += dt;
    const t = this.elapsed;
    const wind = windAt(t);

    this.updatePlayer(dt, t, wind);
    this.updateRivals(dt, t, wind);
    if (this.phase === 'playing') this.updatePechas(dt);
    this.updateSky(dt);
    this.fireworks.update(dt);
    this.updateCamera(t);
    this.world.update(t, this.camera.position, !this.reduceMotion);
    this.updateLabels();

    this.audio.setWind(Math.min(1, this.player.body.velocity.length() / 18));
    this.renderer.render(this.scene, this.camera);
  };

  private updatePlayer(dt: number, t: number, wind: number): void {
    const kite = this.player;

    if (kite.isFlying) {
      const autopilot = this.phase === 'intro';
      const pull = autopilot || this.controls.pulling;
      const pointer = autopilot
        ? this.autopilot.set(0.32 * Math.sin(t * 0.37), 0.34 + 0.16 * Math.sin(t * 0.61))
        : this.controls.pointer;
      this.ray.setFromCamera(pointer, this.aimCamera);
      this.ray.ray.at(PLAYER.aimDistance, this.aim);
      aimOnLine(kite.body.anchor, this.aim, kite.body.lineLength, this.aim);
      const inPecha = this.rivals.some((r) => r.hooked);
      kite.fly({ pull, target: this.aim, inPecha }, wind, dt, t, this.camera.position);

      if (this.phase === 'playing') {
        this.hud.setFlight(pull, kite.body.lineLength, kite.body.position.y);
        this.hud.setLow(kite.body.position.y < kite.body.anchor.y + PLAYER.lowWarningHeight);
        if (kite.body.floorTime > PLAYER.crashSeconds) this.lose('crash');
      }
    } else if (kite.fall(wind, dt)) {
      kite.mesh.visible = false;
    }

    if (this.phase === 'lost') {
      this.lostTimer -= dt;
      if (this.lostTimer <= 0) {
        this.setPhase('over');
        this.hud.showGameOver({
          ...this.lostTo,
          cuts: this.cuts,
          best: this.best,
          newBest: this.newBest,
        });
      }
    }
  }

  private updateRivals(dt: number, t: number, wind: number): void {
    const gone: Rival[] = [];
    for (const rival of this.rivals) {
      if (rival.kite.isFlying) {
        const input = rival.brain.think({
          self: rival.kite.body,
          playerLine: this.player.string.points,
          playerKite: this.player.body.position,
          hooked: rival.hooked,
          dt,
        });
        rival.kite.fly(input, wind, dt, t, this.camera.position);
      } else if (rival.kite.fall(wind, dt)) {
        gone.push(rival);
      }
    }
    for (const rival of gone) this.removeRival(rival);
    if (gone.length) this.rivals = this.rivals.filter((r) => !gone.includes(r));

    if (this.phase !== 'playing') return;
    const difficulty = difficultyFor(this.cuts);
    const flying = this.rivals.filter((r) => r.kite.isFlying).length;
    if (flying >= difficulty.maxRivals) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnRival(difficulty);
      this.spawnTimer = range(this.rng, ...RIVALS.respawnDelay);
    }
  }

  private spawnRival(difficulty: Difficulty): void {
    const takenNames = new Set(this.rivals.map((r) => r.name));
    const takenRoofs = this.rivals.map((r) => r.kite.body.anchor);
    const names = RIVALS.names.filter((n) => !takenNames.has(n));
    const roofs = this.world.flyerRooftops.filter((roof) =>
      takenRoofs.every((a) => Math.hypot(a.x - roof.x, a.z - roof.z) > 30),
    );
    if (!names.length || !roofs.length) return;

    const roof = pick(this.rng, roofs);
    const rival = new Rival(
      this.scene,
      {
        name: pick(this.rng, names),
        anchor: new Vector3(roof.x, roof.height + 1.5, roof.z),
        colors: pick(this.rng, RIVALS.colors),
        personality: pick(this.rng, difficulty.personalities),
        sharpness: difficulty.sharpness,
      },
      this.rng,
    );
    this.rivals.push(rival);
    this.labels.set(rival, new RivalLabel(this.hud.labelLayer, rival.name));
  }

  private removeRival(rival: Rival): void {
    rival.kite.dispose();
    this.labels.get(rival)?.remove();
    this.labels.delete(rival);
  }

  /** Checks every rival line against yours and saws the hooked ones. */
  private updatePechas(dt: number): void {
    const player = this.player;
    let focus: Rival | undefined;
    const mySaw = sawSpeed(player.body);

    for (const rival of this.rivals) {
      if (!rival.kite.isFlying) continue;
      const contact = polylineDistance(
        player.string.points,
        rival.kite.string.points,
        PECHA.ignoreNearAnchor,
        PECHA.ignoreNearAnchor,
      );
      rival.hooked = isHooked(contact.distance, rival.hooked);
      if (!rival.hooked) continue;

      const damage = pechaDamage(
        { saw: mySaw, sharpness: 1 },
        { saw: sawSpeed(rival.kite.body), sharpness: rival.sharpness },
        dt,
      );
      this.lineHealth -= damage.toA;
      rival.health -= damage.toB;

      if (rival.health <= 0) {
        this.cutRival(rival, contact.point);
      } else if (this.lineHealth <= 0) {
        this.lose('cut', rival.name, contact.point);
        return;
      } else if (!focus || rival.health < focus.health) {
        focus = rival;
      }
    }

    if (focus) {
      this.hud.showPecha(focus.name, this.lineHealth, focus.health, this.pechaHint(focus, mySaw));
      this.audio.setSaw(Math.min(1, mySaw / 12));
    } else {
      this.lineHealth = Math.min(1, this.lineHealth + PECHA.regenPerSecond * dt);
      this.hud.hidePecha();
      this.audio.setSaw(0);
    }
  }

  private pechaHint(rival: Rival, mySaw: number): string {
    if (this.player.body.lineLength >= KITE_PHYSICS.maxLine - 1) {
      return 'Out of dor! Khainch, then give dheel again.';
    }
    return mySaw > sawSpeed(rival.kite.body)
      ? 'You’re sawing through their dor. Keep it moving!'
      : 'They’re sawing faster. Give dheel, fast!';
  }

  private cutRival(rival: Rival, at: Vector3): void {
    rival.kite.cut(at);
    this.celebrateCut(rival, at);
    rival.hooked = false;
    this.cuts += 1;
    if (this.cuts > this.best) {
      this.best = this.cuts;
      this.newBest = true;
      saveBest(this.best);
    }
    this.hud.setScore(this.cuts);
    this.hud.celebrate(rival.name);
    this.audio.snap();
    this.audio.cheer();
    this.audio.dhol();
  }

  /** Kite paper confetti where the line snapped, fireworks above, a beat of slow motion. */
  private celebrateCut(rival: Rival, at: Vector3): void {
    const { left, right, accent } = rival.colors;
    this.fireworks.burst(rival.kite.mesh.position, [left, right, accent], 'paper');
    const shells = FIREWORKS.colors;
    for (let i = 0; i < 3; i++) {
      this.fxPoint.set(range(this.rng, -14, 14), range(this.rng, 8, 20), range(this.rng, -8, 8));
      this.fxPoint.add(at);
      const shell = pick(this.rng, shells);
      this.fireworks.burst(this.fxPoint, [shell, pick(this.rng, shells)], 'firework', i * 0.25);
    }
    if (!this.reduceMotion) {
      this.slowMo = JUICE.slowMoSeconds;
      this.shake = JUICE.shake;
    }
  }

  /** Golden hour fades to night as the round goes on; fireworks go up after dark. */
  private updateSky(dt: number): void {
    if (this.phase === 'playing') this.roundTime += dt;
    const target = this.phase === 'intro' ? 0 : nightFor(this.roundTime);
    this.night += (target - this.night) * Math.min(1, dt * TIME_OF_DAY.easing);
    this.world.setNight(this.night);

    if (this.night < FIREWORKS.ambientFromNight) return;
    this.ambientFireworkTimer -= dt;
    if (this.ambientFireworkTimer > 0) return;
    this.ambientFireworkTimer = range(this.rng, ...FIREWORKS.ambientEvery);
    this.fxPoint.set(
      range(this.rng, -260, 260),
      range(this.rng, 90, 150),
      range(this.rng, -450, -220),
    );
    const shell = pick(this.rng, FIREWORKS.colors);
    this.fireworks.burst(this.fxPoint, [shell], 'firework', 0, 3);
  }

  private lose(reason: 'cut' | 'crash', by?: string, at?: Vector3): void {
    this.setPhase('lost');
    this.lostTimer = GAME_OVER_DELAY;
    this.lostTo = by === undefined ? { reason } : { reason, by };
    this.controls.enabled = false;
    if (at) this.player.cut(at);
    for (const rival of this.rivals) rival.hooked = false;
    this.hud.hidePecha();
    this.hud.setLow(false);
    this.audio.setSaw(0);
    this.audio.snap();
    this.audio.lose();
  }

  /** Stand on the roof, lean a little toward your kite, sway like a person does. */
  private updateCamera(t: number): void {
    this.look.copy(this.lookHome).lerp(this.player.mesh.position, this.follow);
    this.camera.position.copy(this.cameraHome);
    if (!this.reduceMotion) {
      this.camera.position.x += Math.sin(t * 0.5) * CAMERA.sway;
      this.camera.position.y += Math.sin(t * 0.8) * CAMERA.sway * 0.4;
    }
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }
    this.camera.lookAt(this.look);
  }

  /** Name tags follow rival kites; kites off-screen get an arrow at the nearest edge. */
  private updateLabels(): void {
    for (const [rival, label] of this.labels) {
      if (!rival.kite.isFlying) {
        label.place(0, 0, false);
        continue;
      }
      this.projected.copy(rival.kite.mesh.position);
      this.projected.y += LABEL_LIFT;
      this.projected.project(this.camera);
      // Behind the camera, projection mirrors: flip so the arrow points the right way.
      const behind = this.projected.z > 1;
      const x = behind ? -this.projected.x : this.projected.x;
      const onScreen = !behind && Math.abs(x) <= 1 && Math.abs(this.projected.y) <= 1;
      const px = ((x + 1) / 2) * innerWidth;
      const py = ((1 - this.projected.y) / 2) * innerHeight;
      if (onScreen) {
        label.place(px, py, true);
      } else {
        const edge = x < 0 ? 'left' : 'right';
        label.place(
          edge === 'left' ? EDGE_MARGIN : innerWidth - EDGE_MARGIN,
          Math.min(Math.max(py, 90), innerHeight - 120),
          true,
          edge,
        );
      }
      label.setLine(rival.health, rival.hooked);
    }
  }

  /** Lowers the resolution while the frame rate is poor (slower phones). */
  private trackFrameRate(frameSeconds: number): void {
    // Ignore stalls (tab switches) that aren't about rendering speed.
    if (frameSeconds <= 0 || frameSeconds > 0.25) return;
    this.fpsFrames += 1;
    this.fpsTime += frameSeconds;
    if (this.fpsTime < FPS_WINDOW) return;
    const next = nextPixelRatio(this.pixelRatio, this.fpsFrames / this.fpsTime, this.minPixelRatio);
    this.fpsFrames = 0;
    this.fpsTime = 0;
    if (next !== this.pixelRatio) {
      this.pixelRatio = next;
      this.renderer.setPixelRatio(next);
    }
  }

  /** Frames the view for the screen's shape: wider in portrait, following the kite more. */
  private fitCamera(): void {
    const aspect = innerWidth / innerHeight;
    this.camera.aspect = aspect;
    this.camera.fov = verticalFov(aspect);
    this.camera.updateProjectionMatrix();
    this.follow = followAmount(aspect, CAMERA.followKite);
  }

  private readonly onResize = (): void => {
    this.renderer.setSize(innerWidth, innerHeight);
    this.fitCamera();
  };
}
