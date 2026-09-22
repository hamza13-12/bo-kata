import { Vector3 } from 'three';
import { KITE_PHYSICS as K, WIND } from '../config';

/** What a flyer does with their hands this frame. */
export interface KiteInput {
  /** true = khainch (pull the line in), false = dheel (let line out). */
  readonly pull: boolean;
  /** Where the flyer is steering the kite. */
  readonly target: Vector3;
}

/** Pure kite state: no rendering, so it can be unit tested and shared by player and rivals. */
export class KiteBody {
  readonly anchor: Vector3;
  readonly position: Vector3;
  readonly velocity = new Vector3();
  lineLength: number;
  /** Metres per second the line is paying out; negative while reeling in. */
  lineRate = 0;
  /** Seconds the kite has spent pinned at its lowest allowed height. */
  floorTime = 0;

  constructor(anchor: Vector3, start: Vector3, lineLength: number) {
    this.anchor = anchor.clone();
    this.position = start.clone();
    this.lineLength = lineLength;
  }
}

/** Horizontal wind speed (m/s, blowing toward +x) at time `t`. */
export function windAt(t: number): number {
  return (
    WIND.base +
    WIND.gust * Math.sin(t * WIND.gustFrequency) +
    WIND.flutter * Math.sin(t * WIND.flutterFrequency)
  );
}

/**
 * Turns a direction (anchor toward `through`) into a steering target that
 * sits on the sphere the line allows, and never scrapes the rooftops.
 */
export function aimOnLine(
  anchor: Vector3,
  through: Vector3,
  lineLength: number,
  out: Vector3,
): Vector3 {
  out.subVectors(through, anchor);
  if (out.lengthSq() < 1e-9) out.set(0, 1, 0);
  out.normalize().multiplyScalar(lineLength).add(anchor);
  out.y = Math.max(out.y, anchor.y + K.minTargetHeight);
  return out;
}

const acc = new Vector3();
const outward = new Vector3();

/** Advances a flying kite by `dt` seconds. */
export function stepKite(body: KiteBody, input: KiteInput, windX: number, dt: number): void {
  if (dt <= 0) return;

  const before = body.lineLength;
  body.lineLength = input.pull
    ? Math.max(K.minLine, before - K.reelInSpeed * dt)
    : Math.min(K.maxLine, before + K.letOutSpeed * dt);
  body.lineRate = (body.lineLength - before) / dt;

  acc
    .subVectors(input.target, body.position)
    .multiplyScalar(input.pull ? K.pullSteer : K.slackSteer);
  if (input.pull) {
    acc.y += K.pullLift;
  } else {
    acc.x += windX * K.windDrift;
    acc.z -= K.downwindZ;
    acc.y -= K.slackSink;
  }

  body.velocity
    .addScaledVector(acc, dt)
    .multiplyScalar(Math.exp(-(input.pull ? K.pullDamping : K.slackDamping) * dt));
  body.position.addScaledVector(body.velocity, dt);

  constrainToLine(body);

  const floor = body.anchor.y + K.floorClearance;
  if (body.position.y <= floor) {
    body.position.y = floor;
    if (body.velocity.y < 0) body.velocity.y = 0;
    body.floorTime += dt;
  } else {
    body.floorTime = 0;
  }
}

/** Advances a kite whose line has been cut: it drifts downwind and sinks. */
export function stepFalling(body: KiteBody, windX: number, dt: number): void {
  if (dt <= 0) return;
  body.velocity.x += windX * 0.5 * dt;
  body.velocity.y -= K.fallGravity * dt;
  body.velocity.multiplyScalar(Math.exp(-K.fallDrag * dt));
  body.position.addScaledVector(body.velocity, dt);
}

/** The line can't stretch: keep the kite inside it and cancel outward speed. */
function constrainToLine(body: KiteBody): void {
  outward.subVectors(body.position, body.anchor);
  const length = outward.length();
  if (length <= body.lineLength) return;
  outward.divideScalar(length);
  body.position.copy(body.anchor).addScaledVector(outward, body.lineLength);
  const speedOut = body.velocity.dot(outward);
  if (speedOut > 0) body.velocity.addScaledVector(outward, -speedOut);
}
