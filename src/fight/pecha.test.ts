import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { KITE_PHYSICS, PECHA } from '../config';
import { isHooked, pechaDamage, sawSpeed } from './pecha';

describe('pechaDamage', () => {
  it('the faster line cuts the slower one', () => {
    const damage = pechaDamage({ saw: 9, sharpness: 1 }, { saw: 3, sharpness: 1 }, 1);
    expect(damage.toB).toBeGreaterThan(0);
    expect(damage.toA).toBe(0);
  });

  it('a still line deals nothing and takes full damage', () => {
    const damage = pechaDamage({ saw: 0, sharpness: 1 }, { saw: 5, sharpness: 1 }, 1);
    expect(damage.toB).toBe(0);
    expect(damage.toA).toBeCloseTo(5 * PECHA.damageRate);
  });

  it('equal lines wear each other down equally', () => {
    const damage = pechaDamage({ saw: 6, sharpness: 1 }, { saw: 6, sharpness: 1 }, 1);
    expect(damage.toA).toBeCloseTo(damage.toB);
    expect(damage.toA).toBeGreaterThan(0);
  });

  it('sharper manjha cuts faster', () => {
    const dull = pechaDamage({ saw: 8, sharpness: 1 }, { saw: 2, sharpness: 1 }, 1);
    const sharp = pechaDamage({ saw: 8, sharpness: 1.5 }, { saw: 2, sharpness: 1 }, 1);
    expect(sharp.toB).toBeCloseTo(dull.toB * 1.5);
  });

  it('scales with time', () => {
    const one = pechaDamage({ saw: 8, sharpness: 1 }, { saw: 2, sharpness: 1 }, 1);
    const half = pechaDamage({ saw: 8, sharpness: 1 }, { saw: 2, sharpness: 1 }, 0.5);
    expect(half.toB).toBeCloseTo(one.toB / 2);
  });

  it('dheel beats a plain khainch, as in a real dheel pecha', () => {
    const dheel = KITE_PHYSICS.letOutSpeed;
    const khainch = KITE_PHYSICS.reelInSpeed;
    const damage = pechaDamage({ saw: dheel, sharpness: 1 }, { saw: khainch, sharpness: 1 }, 1);
    expect(damage.toB).toBeGreaterThan(damage.toA);
  });
});

describe('sawSpeed', () => {
  it('counts line paid in or out, in either direction', () => {
    const still = new Vector3();
    expect(sawSpeed({ lineRate: 9, velocity: still })).toBe(9);
    expect(sawSpeed({ lineRate: -5, velocity: still })).toBe(5);
  });

  it('adds some of the kite’s own speed', () => {
    expect(sawSpeed({ lineRate: 0, velocity: new Vector3(10, 0, 0) })).toBeCloseTo(
      10 * PECHA.kiteSpeedSaw,
    );
  });
});

describe('isHooked', () => {
  it('hooks only when lines touch', () => {
    expect(isHooked(PECHA.engageDistance - 0.1, false)).toBe(true);
    expect(isHooked(PECHA.engageDistance + 0.1, false)).toBe(false);
  });

  it('stays hooked until pulled well apart', () => {
    expect(isHooked(PECHA.releaseDistance - 0.1, true)).toBe(true);
    expect(isHooked(PECHA.releaseDistance + 0.1, true)).toBe(false);
  });
});
