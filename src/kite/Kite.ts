import type { Group, Scene } from 'three';
import { Vector3 } from 'three';
import type { KiteColors } from '../config';
import { disposeObject } from '../core/dispose';
import { createKiteMesh } from './kiteMesh';
import { KiteString } from './kiteString';
import type { KiteInput } from './physics';
import { KiteBody, stepFalling, stepKite } from './physics';

export interface KiteOptions {
  readonly anchor: Vector3;
  readonly start: Vector3;
  readonly lineLength: number;
  readonly colors: KiteColors;
  readonly scale: number;
  readonly stringColor: string;
  readonly stringSegments: number;
  /** Offsets the kite's idle dance so kites don't move in lockstep. */
  readonly phase?: number;
}

export type KiteState = 'flying' | 'falling';

/** How long a cut kite keeps drifting before it is removed. */
const FALL_SECONDS = 7;
const LINE_FADE_SECONDS = 1.8;
/** Where the loose end of a cut line hangs, relative to the kite. */
const TAIL_DROP = new Vector3(-2, -12, 1);

/** A kite in the scene: physics body, patang mesh and its dor. */
export class Kite {
  readonly body: KiteBody;
  readonly mesh: Group;
  readonly string: KiteString;
  state: KiteState = 'flying';

  /** The cut-off piece of line that trails under a falling kite. */
  private readonly tail: KiteString;
  private readonly phase: number;
  private readonly cutPoint = new Vector3();
  private readonly spin = new Vector3();
  private readonly scratch = new Vector3();
  private sag = 3;
  private fallAge = 0;

  constructor(scene: Scene, options: KiteOptions) {
    this.body = new KiteBody(options.anchor, options.start, options.lineLength);
    this.mesh = createKiteMesh(options.colors, options.scale);
    this.mesh.position.copy(options.start);
    this.string = new KiteString(options.stringColor, options.stringSegments);
    this.tail = new KiteString(options.stringColor, 8);
    this.tail.visible = false;
    this.phase = options.phase ?? 0;
    this.string.update(this.body.anchor, this.mesh.position, this.sag);
    scene.add(this.mesh, this.string.line, this.tail.line);
  }

  get isFlying(): boolean {
    return this.state === 'flying';
  }

  fly(input: KiteInput, windX: number, dt: number, t: number, viewer: Vector3): void {
    stepKite(this.body, input, windX, dt);
    this.pose(t, viewer, input.pull);
    const targetSag = (input.pull ? 1.5 : 7) * (this.body.lineLength / 100);
    this.sag += (targetSag - this.sag) * Math.min(1, dt * 3);
    this.string.update(this.body.anchor, this.mesh.position, this.sag);
  }

  /** The line snaps at `at`: the kite is now loose. */
  cut(at: Vector3): void {
    if (this.state === 'falling') return;
    this.state = 'falling';
    this.cutPoint.copy(at);
    this.fallAge = 0;
    this.spin
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() * 2 - 1)
      .multiplyScalar(3);
    this.tail.visible = true;
  }

  /** Animates a cut kite. Returns true once it has drifted out of the game. */
  fall(windX: number, dt: number): boolean {
    stepFalling(this.body, windX, dt);
    this.fallAge += dt;
    this.mesh.position.copy(this.body.position);
    this.mesh.rotation.x += this.spin.x * dt;
    this.mesh.rotation.y += this.spin.y * dt;
    this.mesh.rotation.z += this.spin.z * dt;

    // The flyer's half of the dor drops away and fades.
    this.scratch.copy(this.cutPoint);
    this.scratch.y -= this.fallAge * this.fallAge * 4;
    this.string.update(this.body.anchor, this.scratch, this.sag + this.fallAge * 6);
    this.string.opacity = Math.max(0, 1 - this.fallAge / LINE_FADE_SECONDS);

    // The kite trails its cut-off piece.
    this.scratch.copy(this.mesh.position).add(TAIL_DROP);
    this.tail.update(this.mesh.position, this.scratch, 2);
    this.tail.opacity = Math.max(0, 1 - this.fallAge / FALL_SECONDS);

    return this.fallAge > FALL_SECONDS;
  }

  dispose(): void {
    disposeObject(this.mesh);
    this.string.dispose();
    this.tail.dispose();
  }

  /** Places the mesh: facing the viewer, banking into turns, dancing a little. */
  private pose(t: number, viewer: Vector3, pull: boolean): void {
    const p = this.body.position;
    const j = this.phase;
    this.mesh.position.set(
      p.x + Math.sin(t * 2.3 + j) * 0.35 + Math.sin(t * 5.1 + j) * 0.12,
      p.y + Math.sin(t * 1.9 + 1 + j) * 0.3,
      p.z,
    );
    this.mesh.lookAt(viewer);
    this.mesh.rotateZ(-this.body.velocity.x * 0.045 + Math.sin(t * 3.1 + j) * 0.09);
    this.mesh.rotateX(pull ? -0.1 : -0.3);
  }
}
