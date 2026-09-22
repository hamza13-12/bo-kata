import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { LIGHT_LEVELS, NIGHT_SKY, SKY, TIME_OF_DAY } from '../config';
import type { SkyColors } from './timeOfDay';
import { lightLevelsAt, nightFor, skyColorsAt } from './timeOfDay';

const blank = (): SkyColors => ({
  top: new Color(),
  middle: new Color(),
  horizon: new Color(),
  fog: new Color(),
});

describe('nightFor', () => {
  it('stays golden hour at the start of a round', () => {
    expect(nightFor(0)).toBe(0);
    expect(nightFor(TIME_OF_DAY.duskStarts)).toBe(0);
  });

  it('reaches full night and stays there', () => {
    expect(nightFor(TIME_OF_DAY.nightFalls)).toBe(1);
    expect(nightFor(10_000)).toBe(1);
  });

  it('only ever gets darker', () => {
    let previous = 0;
    for (let s = 0; s <= TIME_OF_DAY.nightFalls; s += 5) {
      const n = nightFor(s);
      expect(n).toBeGreaterThanOrEqual(previous);
      previous = n;
    }
  });
});

describe('skyColorsAt', () => {
  it('is the golden-hour palette at 0', () => {
    const c = skyColorsAt(0, blank());
    expect(c.top.getHexString()).toBe(new Color(SKY.top).getHexString());
    expect(c.fog.getHexString()).toBe(new Color(SKY.fog).getHexString());
  });

  it('is the night palette at 1, and clamps beyond it', () => {
    const c = skyColorsAt(3, blank());
    expect(c.top.getHexString()).toBe(new Color(NIGHT_SKY.top).getHexString());
    expect(c.horizon.getHexString()).toBe(new Color(NIGHT_SKY.horizon).getHexString());
  });
});

describe('lightLevelsAt', () => {
  it('sets the sun at night', () => {
    expect(lightLevelsAt(0).sun).toBe(LIGHT_LEVELS.day.sun);
    expect(lightLevelsAt(1).sun).toBe(0);
  });

  it('blends halfway', () => {
    const { day, night } = LIGHT_LEVELS;
    expect(lightLevelsAt(0.5).hemisphere).toBeCloseTo((day.hemisphere + night.hemisphere) / 2);
  });
});
