import type { Scene } from 'three';
import { Vector3 } from 'three';
import type { KiteColors } from '../config';
import { RIVALS } from '../config';
import type { Rng } from '../core/rng';
import { range } from '../core/rng';
import { Kite } from '../kite/Kite';
import type { Personality } from './difficulty';
import { RivalBrain } from './rivalBrain';

export interface RivalSpawn {
  readonly name: string;
  readonly anchor: Vector3;
  readonly colors: KiteColors;
  readonly personality: Personality;
  readonly sharpness: number;
}

/** A flyer on another rooftop: their kite, their brain and their line's health. */
export class Rival {
  readonly name: string;
  readonly kite: Kite;
  readonly brain: RivalBrain;
  readonly sharpness: number;
  readonly colors: KiteColors;
  /** 1 = fresh line, 0 = cut. */
  health = 1;
  hooked = false;

  constructor(scene: Scene, spawn: RivalSpawn, rng: Rng) {
    this.name = spawn.name;
    this.sharpness = spawn.sharpness;
    this.colors = spawn.colors;

    // Rivals fly toward the middle of the sky, in front of the player, so
    // they stay in view even on a phone held upright.
    const inward = -Math.sign(spawn.anchor.x) || 1;
    const home = new Vector3(
      spawn.anchor.x + inward * Math.abs(spawn.anchor.x) * range(rng, 0.45, 0.75),
      spawn.anchor.y + range(rng, 30, 45),
      spawn.anchor.z - range(rng, 15, 30),
    );
    const start = spawn.anchor.clone().add(new Vector3(inward * 8, 30, -30));

    this.kite = new Kite(scene, {
      anchor: spawn.anchor,
      start,
      lineLength: 70,
      colors: spawn.colors,
      scale: RIVALS.scale,
      stringColor: RIVALS.stringColor,
      stringSegments: RIVALS.stringSegments,
      phase: range(rng, 0, 10),
    });
    this.brain = new RivalBrain(spawn.personality, home, rng);
  }
}
