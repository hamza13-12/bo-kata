import type { ColorRepresentation } from 'three';
import {
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import type { KiteColors } from '../config';

const TOP: readonly number[] = [0, 1.25, 0];
const RIGHT: readonly number[] = [1, 0.25, 0];
const BOTTOM: readonly number[] = [0, -1, 0];
const LEFT: readonly number[] = [-1, 0.25, 0];

function panel(vertices: readonly number[], color: ColorRepresentation): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  // Unlit: kite paper glows with the sun behind it.
  return new Mesh(geometry, new MeshBasicMaterial({ color, side: DoubleSide }));
}

function line(points: Vector3[]): Line {
  return new Line(
    new BufferGeometry().setFromPoints(points),
    new LineBasicMaterial({ color: '#3B2616' }),
  );
}

/**
 * A Lahori patang: a diamond split into two colours, a round "chand" in the
 * middle, a small tail, a bamboo spine and the curved kamaan across the top.
 * The kite faces +z, so `lookAt(viewer)` shows its face.
 */
export function createKiteMesh(colors: KiteColors, scale: number): Group {
  const kite = new Group();
  kite.add(panel([...TOP, ...LEFT, ...BOTTOM], colors.left));
  kite.add(panel([...TOP, ...BOTTOM, ...RIGHT], colors.right));
  kite.add(panel([0, -1, 0, -0.32, -1.45, 0, 0.32, -1.45, 0], colors.accent));

  const chand = new Mesh(
    new CircleGeometry(0.3, 24),
    new MeshBasicMaterial({ color: colors.accent, side: DoubleSide }),
  );
  chand.position.set(0, 0.22, 0.02);
  kite.add(chand);

  kite.add(line([new Vector3(0, 1.25, 0), new Vector3(0, -1, 0)]));
  const bow: Vector3[] = [];
  for (let i = 0; i <= 14; i++) {
    const x = -1 + (2 * i) / 14;
    bow.push(new Vector3(x, 0.25 + 0.32 * (1 - x * x), 0.01));
  }
  kite.add(line(bow));

  kite.scale.setScalar(scale);
  return kite;
}
