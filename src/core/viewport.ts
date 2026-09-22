import { MathUtils } from 'three';

/**
 * Camera framing that adapts to the screen's shape, so a phone held in
 * portrait still sees enough sky to find rival kites.
 */

export const BASE_VERTICAL_FOV = 60;
/** Degrees of sky across the screen we try to keep on narrow screens. */
const MIN_HORIZONTAL_FOV = 80;
/** Past this, a portrait view starts to look like a fisheye lens. */
const MAX_VERTICAL_FOV = 92;

/** Vertical field of view (degrees) for a screen of `aspect` = width / height. */
export function verticalFov(aspect: number): number {
  if (!(aspect > 0)) return BASE_VERTICAL_FOV;
  const halfWidth = MathUtils.degToRad(MIN_HORIZONTAL_FOV / 2);
  const needed = MathUtils.radToDeg(2 * Math.atan(Math.tan(halfWidth) / aspect));
  return MathUtils.clamp(needed, BASE_VERTICAL_FOV, MAX_VERTICAL_FOV);
}

/**
 * How far the camera turns toward your kite (0 = fixed, 1 = locked on).
 * Narrow screens follow more, so the kite never slides out of view.
 */
export function followAmount(aspect: number, base: number): number {
  const narrowness = MathUtils.clamp((1.3 - aspect) / (1.3 - 0.5), 0, 1);
  return MathUtils.lerp(base, 0.6, narrowness);
}

/**
 * Dynamic resolution: steps the pixel ratio down while the frame rate is
 * poor, never below `min`. Returns the ratio to use next.
 */
export function nextPixelRatio(current: number, fps: number, min: number): number {
  if (fps >= 45 || current <= min) return current;
  return Math.max(min, Math.round((current - 0.25) * 100) / 100);
}
