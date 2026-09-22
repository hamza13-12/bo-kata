import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { KITE_PHYSICS } from '../config';
import { aimOnLine, KiteBody, stepFalling, stepKite, windAt } from './physics';

const anchor = new Vector3(0, 10, 0);

function simulate(body: KiteBody, pull: boolean, target: Vector3, seconds: number): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) stepKite(body, { pull, target }, 4, dt);
}

describe('stepKite', () => {
  it('reels line in while pulling and never below the minimum', () => {
    const body = new KiteBody(anchor, new Vector3(0, 60, -40), 60);
    simulate(body, true, new Vector3(0, 60, -40), 10);
    expect(body.lineLength).toBe(KITE_PHYSICS.minLine);
    expect(body.lineRate).toBeCloseTo(0);
  });

  it('lets line out while slack and never past the maximum', () => {
    const body = new KiteBody(anchor, new Vector3(0, 60, -40), 60);
    simulate(body, false, new Vector3(0, 60, -40), 30);
    expect(body.lineLength).toBe(KITE_PHYSICS.maxLine);
  });

  it('reports the line rate while paying out', () => {
    const body = new KiteBody(anchor, new Vector3(0, 60, -40), 60);
    stepKite(body, { pull: false, target: body.position.clone() }, 4, 0.1);
    expect(body.lineRate).toBeCloseTo(KITE_PHYSICS.letOutSpeed);
  });

  it('never lets the kite get further away than its line', () => {
    const body = new KiteBody(anchor, new Vector3(0, 50, -30), 50);
    const farAway = new Vector3(500, 400, -500);
    const dt = 1 / 60;
    for (let i = 0; i < 600; i++) {
      stepKite(body, { pull: true, target: farAway }, 4, dt);
      expect(body.position.distanceTo(body.anchor)).toBeLessThanOrEqual(body.lineLength + 1e-6);
    }
  });

  it('steers toward the target while pulling', () => {
    const body = new KiteBody(anchor, new Vector3(0, 50, -40), 80);
    const target = aimOnLine(anchor, new Vector3(40, 50, -40), 80, new Vector3());
    const before = body.position.distanceTo(target);
    simulate(body, true, target, 2);
    expect(body.position.distanceTo(target)).toBeLessThan(before / 2);
  });

  it('sinks while slack and counts time pinned at the floor', () => {
    const body = new KiteBody(anchor, new Vector3(0, 20, -20), 60);
    simulate(body, false, body.position.clone().setY(anchor.y), 20);
    expect(body.position.y).toBeCloseTo(anchor.y + KITE_PHYSICS.floorClearance);
    expect(body.floorTime).toBeGreaterThan(1);
  });

  it('does nothing for a zero time step', () => {
    const body = new KiteBody(anchor, new Vector3(0, 50, -40), 80);
    stepKite(body, { pull: true, target: new Vector3() }, 4, 0);
    expect(body.position.toArray()).toEqual([0, 50, -40]);
  });
});

describe('aimOnLine', () => {
  it('puts the target on the sphere the line allows', () => {
    const out = aimOnLine(anchor, new Vector3(0, 40, -100), 70, new Vector3());
    expect(out.distanceTo(anchor)).toBeCloseTo(70);
  });

  it('never aims into the rooftops', () => {
    const out = aimOnLine(anchor, new Vector3(0, -50, -100), 70, new Vector3());
    expect(out.y).toBe(anchor.y + KITE_PHYSICS.minTargetHeight);
  });
});

describe('stepFalling', () => {
  it('drifts downwind and down', () => {
    const body = new KiteBody(anchor, new Vector3(0, 60, -40), 80);
    for (let i = 0; i < 120; i++) stepFalling(body, 5, 1 / 60);
    expect(body.position.x).toBeGreaterThan(0);
    expect(body.position.y).toBeLessThan(60);
  });
});

describe('windAt', () => {
  it('always blows the same way', () => {
    for (let t = 0; t < 100; t += 0.5) expect(windAt(t)).toBeGreaterThan(0);
  });
});
