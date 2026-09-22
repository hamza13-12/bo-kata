import { Color, MathUtils } from 'three';
import { LIGHT_LEVELS, NIGHT_SKY, SKY, TIME_OF_DAY } from '../config';

/** 0 = golden hour, 1 = full night, for a round that has run `seconds`. */
export function nightFor(seconds: number): number {
  return MathUtils.smoothstep(seconds, TIME_OF_DAY.duskStarts, TIME_OF_DAY.nightFalls);
}

export interface SkyColors {
  readonly top: Color;
  readonly middle: Color;
  readonly horizon: Color;
  readonly fog: Color;
}

export interface LightLevels {
  readonly hemisphere: number;
  readonly sun: number;
  readonly fill: number;
}

const day = {
  top: new Color(SKY.top),
  middle: new Color(SKY.middle),
  horizon: new Color(SKY.horizon),
  fog: new Color(SKY.fog),
};
const night = {
  top: new Color(NIGHT_SKY.top),
  middle: new Color(NIGHT_SKY.middle),
  horizon: new Color(NIGHT_SKY.horizon),
  fog: new Color(NIGHT_SKY.fog),
};

/** Sky and fog colours at a given night level, blended from the two palettes. */
export function skyColorsAt(level: number, out: SkyColors): SkyColors {
  const n = MathUtils.clamp(level, 0, 1);
  out.top.lerpColors(day.top, night.top, n);
  out.middle.lerpColors(day.middle, night.middle, n);
  out.horizon.lerpColors(day.horizon, night.horizon, n);
  out.fog.lerpColors(day.fog, night.fog, n);
  return out;
}

export function lightLevelsAt(level: number): LightLevels {
  const n = MathUtils.clamp(level, 0, 1);
  const { day: d, night: k } = LIGHT_LEVELS;
  return {
    hemisphere: MathUtils.lerp(d.hemisphere, k.hemisphere, n),
    sun: MathUtils.lerp(d.sun, k.sun, n),
    fill: MathUtils.lerp(d.fill, k.fill, n),
  };
}
