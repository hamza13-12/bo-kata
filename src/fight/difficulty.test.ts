import { describe, expect, it } from 'vitest';
import { difficultyFor } from './difficulty';

describe('difficultyFor', () => {
  it('starts with one cautious rival and a fair manjha', () => {
    expect(difficultyFor(0)).toEqual({
      maxRivals: 1,
      sharpness: 1,
      personalities: ['cautious'],
    });
  });

  it('adds rivals as you cut, up to four', () => {
    expect(difficultyFor(3).maxRivals).toBe(2);
    expect(difficultyFor(6).maxRivals).toBe(3);
    expect(difficultyFor(100).maxRivals).toBe(4);
  });

  it('brings in meaner personalities', () => {
    expect(difficultyFor(2).personalities).toContain('aggressive');
    expect(difficultyFor(5).personalities).toContain('trickster');
  });

  it('caps rival sharpness', () => {
    expect(difficultyFor(1000).sharpness).toBeCloseTo(1.8);
  });

  it('never gets harder than the start for bad input', () => {
    expect(difficultyFor(-3)).toEqual(difficultyFor(0));
  });
});
