import { CITY, LANDMARKS } from '../config';
import type { Rng } from '../core/rng';
import { pick, range } from '../core/rng';

export interface Block {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly color: string;
  /** -0.05..0.05 lightness shift so neighbours never match exactly. */
  readonly shade: number;
}

export interface RoofItem {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Tree extends RoofItem {
  readonly size: number;
}

export interface CityLayout {
  readonly blocks: readonly Block[];
  /** Stair rooms on the roofs. */
  readonly mumties: readonly (RoofItem & { readonly blockIndex: number })[];
  /** Black water tanks. */
  readonly tanks: readonly RoofItem[];
  readonly trees: readonly Tree[];
}

export function isOnLandmark(x: number, z: number): boolean {
  const { badshahi, minar } = LANDMARKS;
  return (
    (Math.abs(x - badshahi.x) < badshahi.halfWidth &&
      Math.abs(z - badshahi.z) < badshahi.halfDepth) ||
    Math.hypot(x - minar.x, z - minar.z) < minar.clearRadius
  );
}

export function isOnPlayerLot(x: number, z: number): boolean {
  const lot = CITY.playerLot;
  return Math.abs(x) < lot.halfWidth && z > lot.minZ && z < lot.maxZ;
}

/** Pure layout of the old-Lahore rooftops around the player. No three.js objects. */
export function generateCityLayout(rng: Rng): CityLayout {
  const blocks: Block[] = [];
  const mumties: (RoofItem & { blockIndex: number })[] = [];
  const tanks: RoofItem[] = [];
  const trees: Tree[] = [];

  for (let gx = CITY.gridX[0]; gx <= CITY.gridX[1]; gx++) {
    for (let gz = CITY.gridZ[0]; gz <= CITY.gridZ[1]; gz++) {
      if (gx % CITY.streetEveryX === 0 || gz % CITY.streetEveryZ === 0) continue;
      const x = gx * CITY.cell + range(rng, -0.4, 0.4);
      const z = gz * CITY.cell + range(rng, -0.4, 0.4);
      if (isOnPlayerLot(x, z) || isOnLandmark(x, z)) continue;

      if (rng() < 0.04) {
        for (let k = 0; k < 3; k++) {
          trees.push({
            x: x + range(rng, -3, 3),
            y: 0,
            z: z + range(rng, -3, 3),
            size: range(rng, 2.2, 3.8),
          });
        }
        continue;
      }

      // Houses near the player stay low so the view opens over them.
      const distance = Math.hypot(x, z);
      let height =
        distance < 45 ? range(rng, 4, 10) : 5 + Math.floor(rng() * 4) * 3.3 + range(rng, 0, 1.2);
      if (distance > 70 && rng() < 0.06) height += range(rng, 8, 18);

      const width = range(rng, 7.2, 8.8);
      const depth = range(rng, 7.2, 8.8);
      const blockIndex = blocks.length;
      blocks.push({
        x,
        z,
        width,
        depth,
        height,
        color: pick(rng, CITY.plaster),
        shade: range(rng, -0.04, 0.04),
      });

      const sx = rng() < 0.5 ? -1 : 1;
      const sz = rng() < 0.5 ? -1 : 1;
      const mumty =
        rng() < 0.4
          ? {
              x: x + sx * (width / 2 - 1.5),
              y: height,
              z: z + sz * (depth / 2 - 1.5),
              blockIndex,
            }
          : undefined;
      if (mumty) mumties.push(mumty);

      if (rng() < 0.55) {
        tanks.push(
          mumty && rng() < 0.6
            ? { x: mumty.x, y: height + 2.8, z: mumty.z }
            : { x: x - sx * (width / 2 - 1.2), y: height, z: z - sz * (depth / 2 - 1.2) },
        );
      }
    }
  }

  return { blocks, mumties, tanks, trees };
}

/** Rooftops where rival flyers can stand: to the sides and ahead of the player. */
export function flyerRooftops(layout: CityLayout): Block[] {
  const zone = CITY.flyerZone;
  return layout.blocks.filter(
    (b) =>
      Math.abs(b.x) > zone.minAbsX &&
      Math.abs(b.x) < zone.maxAbsX &&
      b.z > zone.minZ &&
      b.z < zone.maxZ,
  );
}
