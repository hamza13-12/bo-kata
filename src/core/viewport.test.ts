import { describe, expect, it } from 'vitest';
import { BASE_VERTICAL_FOV, followAmount, nextPixelRatio, verticalFov } from './viewport';

describe('verticalFov', () => {
  it('keeps the desktop framing on wide screens', () => {
    expect(verticalFov(16 / 9)).toBe(BASE_VERTICAL_FOV);
    expect(verticalFov(21 / 9)).toBe(BASE_VERTICAL_FOV);
  });

  it('widens for portrait phones, within a limit', () => {
    const portrait = verticalFov(390 / 844);
    expect(portrait).toBeGreaterThan(BASE_VERTICAL_FOV);
    expect(portrait).toBeLessThanOrEqual(92);
  });

  it('never narrows as the screen gets taller', () => {
    expect(verticalFov(0.5)).toBeGreaterThanOrEqual(verticalFov(1));
    expect(verticalFov(1)).toBeGreaterThanOrEqual(verticalFov(1.5));
  });

  it('falls back safely for nonsense input', () => {
    expect(verticalFov(0)).toBe(BASE_VERTICAL_FOV);
    expect(verticalFov(Number.NaN)).toBe(BASE_VERTICAL_FOV);
  });
});

describe('followAmount', () => {
  it('uses the base amount on wide screens', () => {
    expect(followAmount(16 / 9, 0.22)).toBe(0.22);
  });

  it('follows the kite more on narrow screens', () => {
    expect(followAmount(0.46, 0.22)).toBeCloseTo(0.6);
    expect(followAmount(0.9, 0.22)).toBeGreaterThan(0.22);
  });
});

describe('nextPixelRatio', () => {
  it('holds steady when the game runs smoothly', () => {
    expect(nextPixelRatio(1.5, 60, 1)).toBe(1.5);
  });

  it('steps down while frames are slow', () => {
    expect(nextPixelRatio(1.5, 30, 1)).toBe(1.25);
  });

  it('never drops below the minimum', () => {
    expect(nextPixelRatio(1.1, 20, 1)).toBe(1);
    expect(nextPixelRatio(1, 20, 1)).toBe(1);
  });
});
