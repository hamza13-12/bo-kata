import { Vector3 } from 'three';
import { KITE_PHYSICS } from '../config';
import type { Rng } from '../core/rng';
import { range } from '../core/rng';
import type { KiteBody, KiteInput } from '../kite/physics';
import { aimOnLine } from '../kite/physics';
import type { Personality } from './difficulty';

export interface BrainContext {
  readonly self: KiteBody;
  readonly playerLine: readonly Vector3[];
  readonly playerKite: Vector3;
  readonly hooked: boolean;
  readonly dt: number;
}

type Mode = 'hover' | 'attack';

/** How close a cautious flyer lets you get before it fights. */
const CAUTIOUS_RANGE = 45;
/** Where on your line (0 = your hand, 1 = your kite) rivals try to cross. */
const CROSS_AT = 0.7;
/** How far past your line a rival steers so its own line sweeps across. */
const OVERSHOOT = 1.25;

/**
 * Decides what a rival flyer does each frame. Its line is steered so that
 * it sweeps across the player's line, and in a pecha it saws according to
 * its personality.
 */
export class RivalBrain {
  private mode: Mode = 'hover';
  private modeTimer: number;
  private sawTimer = 0;
  private sawPull = false;
  private readonly target = new Vector3();
  private readonly scratch = new Vector3();

  constructor(
    readonly personality: Personality,
    private readonly home: Vector3,
    private readonly rng: Rng,
  ) {
    this.modeTimer = range(rng, 2, 4);
  }

  get attacking(): boolean {
    return this.mode === 'attack';
  }

  think(ctx: BrainContext): KiteInput {
    if (ctx.hooked) return this.saw(ctx);
    this.updateMode(ctx);
    return this.mode === 'attack' ? this.attack(ctx) : this.hover(ctx);
  }

  private updateMode(ctx: BrainContext): void {
    this.modeTimer -= ctx.dt;
    switch (this.personality) {
      case 'aggressive':
        if (this.modeTimer <= 0) this.mode = 'attack';
        break;
      case 'cautious':
        this.mode =
          ctx.self.position.distanceTo(ctx.playerKite) < CAUTIOUS_RANGE ? 'attack' : 'hover';
        break;
      case 'trickster':
        if (this.modeTimer <= 0) {
          this.mode = this.mode === 'attack' ? 'hover' : 'attack';
          this.modeTimer = range(this.rng, 3, 6);
        }
        break;
    }
  }

  /** Holds station over home: just enough line out to reach it, no more. */
  private hover(ctx: BrainContext): KiteInput {
    const homeDistance = ctx.self.anchor.distanceTo(this.home);
    aimOnLine(ctx.self.anchor, this.home, ctx.self.lineLength, this.target);
    return { pull: ctx.self.lineLength >= homeDistance, target: this.target };
  }

  /** Steers so this line passes through a point on the player's line. */
  private attack(ctx: BrainContext): KiteInput {
    const cross = ctx.playerLine[Math.floor((ctx.playerLine.length - 1) * CROSS_AT)];
    if (!cross) return this.hover(ctx);

    const toCross = this.scratch.subVectors(cross, ctx.self.anchor);
    const needed = toCross.length() * OVERSHOOT;
    // Aim slightly high: this line sags too.
    toCross.y += 1;
    this.target
      .copy(ctx.self.anchor)
      .addScaledVector(toCross.normalize(), Math.min(needed, KITE_PHYSICS.maxLine));
    // Too little line out to reach across? Give dheel until there is.
    return { pull: ctx.self.lineLength >= needed, target: this.target };
  }

  /** Hooked in a pecha: rub the line according to personality. */
  private saw(ctx: BrainContext): KiteInput {
    const { target } = this.attack(ctx);
    const lineLeft = KITE_PHYSICS.maxLine - ctx.self.lineLength;
    let pull: boolean;
    switch (this.personality) {
      case 'aggressive':
        // Classic dheel pecha: let line rip out until it runs short.
        pull = lineLeft < 8;
        break;
      case 'cautious':
        pull = true;
        break;
      case 'trickster':
        this.sawTimer -= ctx.dt;
        if (this.sawTimer <= 0) {
          this.sawPull = !this.sawPull || lineLeft < 8;
          this.sawTimer = range(this.rng, 0.4, 1.2);
        }
        pull = this.sawPull;
        break;
    }
    return { pull, target, inPecha: true };
  }
}
