import { describe, expect, it } from 'vitest';
import { createRng, pick, range } from './rng';

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it('gives different sequences for different seeds', () => {
    expect(createRng(1)()).not.toEqual(createRng(2)());
  });

  it('stays within [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('range', () => {
  it('maps into [min, max)', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const v = range(rng, -5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });
});

describe('pick', () => {
  it('returns an item from the list', () => {
    const items = ['a', 'b', 'c'];
    const rng = createRng(9);
    for (let i = 0; i < 50; i++) expect(items).toContain(pick(rng, items));
  });

  it('throws on an empty list', () => {
    expect(() => pick(createRng(1), [])).toThrow();
  });
});
