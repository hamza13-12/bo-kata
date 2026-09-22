import { MathUtils, Vector3 } from 'three';

const EPSILON = 1e-9;
const d1 = new Vector3();
const d2 = new Vector3();
const r = new Vector3();
const onA = new Vector3();
const onB = new Vector3();

/**
 * Shortest distance between segments p1-q1 and p2-q2
 * (Ericson, Real-Time Collision Detection, 5.1.9).
 * Writes the closest point on each segment into `outA` / `outB` when given.
 */
export function segmentDistance(
  p1: Vector3,
  q1: Vector3,
  p2: Vector3,
  q2: Vector3,
  outA?: Vector3,
  outB?: Vector3,
): number {
  d1.subVectors(q1, p1);
  d2.subVectors(q2, p2);
  r.subVectors(p1, p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  let s = 0;
  let t = 0;

  if (a > EPSILON || e > EPSILON) {
    if (a <= EPSILON) {
      t = MathUtils.clamp(f / e, 0, 1);
    } else {
      const c = d1.dot(r);
      if (e <= EPSILON) {
        s = MathUtils.clamp(-c / a, 0, 1);
      } else {
        const b = d1.dot(d2);
        const denom = a * e - b * b;
        s = denom > EPSILON ? MathUtils.clamp((b * f - c * e) / denom, 0, 1) : 0;
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = MathUtils.clamp(-c / a, 0, 1);
        } else if (t > 1) {
          t = 1;
          s = MathUtils.clamp((b - c) / a, 0, 1);
        }
      }
    }
  }

  onA.copy(p1).addScaledVector(d1, s);
  onB.copy(p2).addScaledVector(d2, t);
  outA?.copy(onA);
  outB?.copy(onB);
  return onA.distanceTo(onB);
}

export interface PolylineContact {
  readonly distance: number;
  /** Midpoint between the two closest points. */
  readonly point: Vector3;
}

const bestA = new Vector3();
const bestB = new Vector3();
const candA = new Vector3();
const candB = new Vector3();

/**
 * Closest approach between two polylines. `skipA` / `skipB` ignore that
 * fraction of each line from its start (the part near the rooftops).
 */
export function polylineDistance(
  a: readonly Vector3[],
  b: readonly Vector3[],
  skipA = 0,
  skipB = 0,
): PolylineContact {
  let best = Infinity;
  const startA = Math.floor(skipA * (a.length - 1));
  const startB = Math.floor(skipB * (b.length - 1));

  for (let i = startA; i < a.length - 1; i++) {
    const a0 = a[i];
    const a1 = a[i + 1];
    if (!a0 || !a1) continue;
    for (let j = startB; j < b.length - 1; j++) {
      const b0 = b[j];
      const b1 = b[j + 1];
      if (!b0 || !b1) continue;
      const d = segmentDistance(a0, a1, b0, b1, candA, candB);
      if (d < best) {
        best = d;
        bestA.copy(candA);
        bestB.copy(candB);
      }
    }
  }

  return { distance: best, point: new Vector3().addVectors(bestA, bestB).multiplyScalar(0.5) };
}
