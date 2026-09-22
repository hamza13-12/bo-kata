export type Personality = 'cautious' | 'aggressive' | 'trickster';

export interface Difficulty {
  /** Rivals in the sky at once. */
  readonly maxRivals: number;
  /** Rival manjha sharpness (player is always 1). */
  readonly sharpness: number;
  readonly personalities: readonly Personality[];
}

/** The sky gets busier and meaner the more kites you cut. */
export function difficultyFor(cuts: number): Difficulty {
  const safeCuts = Math.max(0, Math.floor(cuts));
  return {
    maxRivals: Math.min(1 + Math.floor(safeCuts / 3), 4),
    sharpness: 1 + Math.min(safeCuts * 0.05, 0.8),
    personalities:
      safeCuts < 2
        ? ['cautious']
        : safeCuts < 5
          ? ['cautious', 'aggressive']
          : ['cautious', 'aggressive', 'trickster'],
  };
}
