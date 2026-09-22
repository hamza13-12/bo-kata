import type { Vector3 } from 'three';
import { PECHA } from '../config';

/**
 * Pecha: two kite lines hooked together. The line that is moving faster
 * across the contact point saws through the slower one.
 */

export interface PechaSide {
  /** How fast this line rubs across the contact (m/s). */
  readonly saw: number;
  /** Manjha quality: multiplies the damage this line deals. */
  readonly sharpness: number;
}

export interface PechaDamage {
  readonly toA: number;
  readonly toB: number;
}

/** How fast a line is rubbing: paying line in or out, plus the kite's own motion. */
export function sawSpeed(body: { readonly lineRate: number; readonly velocity: Vector3 }): number {
  return Math.abs(body.lineRate) + body.velocity.length() * PECHA.kiteSpeedSaw;
}

/** Line damage (fraction of a full line) each side takes over `dt` seconds. */
export function pechaDamage(a: PechaSide, b: PechaSide, dt: number): PechaDamage {
  const edgeA = Math.max(0, a.saw - b.saw * PECHA.counterFactor);
  const edgeB = Math.max(0, b.saw - a.saw * PECHA.counterFactor);
  return {
    toA: edgeB * b.sharpness * PECHA.damageRate * dt,
    toB: edgeA * a.sharpness * PECHA.damageRate * dt,
  };
}

/** Lines hook within the engage distance and stay hooked until pulled well apart. */
export function isHooked(distance: number, wasHooked: boolean): boolean {
  return distance <= (wasHooked ? PECHA.releaseDistance : PECHA.engageDistance);
}
