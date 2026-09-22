import { describe, expect, it } from 'vitest';
import { CITY } from '../config';
import { createRng } from '../core/rng';
import { flyerRooftops, generateCityLayout, isOnLandmark, isOnPlayerLot } from './cityLayout';

describe('generateCityLayout', () => {
  const layout = generateCityLayout(createRng(1234));

  it('builds a dense city', () => {
    expect(layout.blocks.length).toBeGreaterThan(1500);
  });

  it('is the same city for the same seed', () => {
    expect(generateCityLayout(createRng(1234))).toEqual(layout);
  });

  it('keeps the player’s lot and the landmarks clear', () => {
    for (const b of layout.blocks) {
      expect(isOnPlayerLot(b.x, b.z)).toBe(false);
      expect(isOnLandmark(b.x, b.z)).toBe(false);
    }
  });

  it('only uses the plaster palette', () => {
    for (const b of layout.blocks) expect(CITY.plaster).toContain(b.color);
  });

  it('keeps houses right around the player low', () => {
    for (const b of layout.blocks) {
      if (Math.hypot(b.x, b.z) < 45) expect(b.height).toBeLessThanOrEqual(10);
    }
  });

  it('puts every water tank on a roof', () => {
    for (const t of layout.tanks) expect(t.y).toBeGreaterThan(0);
  });
});

describe('flyerRooftops', () => {
  it('offers rival rooftops to both sides of the player', () => {
    const roofs = flyerRooftops(generateCityLayout(createRng(99)));
    expect(roofs.some((r) => r.x < 0)).toBe(true);
    expect(roofs.some((r) => r.x > 0)).toBe(true);
    for (const r of roofs) expect(Math.abs(r.x)).toBeGreaterThan(CITY.flyerZone.minAbsX);
  });
});
