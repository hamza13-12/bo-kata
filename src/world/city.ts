import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
} from 'three';
import type { CityLayout } from './cityLayout';

/** Unit box with its base on y = 0, so scale.y is the building height. */
export const unitBox = (): BoxGeometry => new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
export const tankGeometry = (): CylinderGeometry =>
  new CylinderGeometry(0.8, 0.8, 1.5, 10).translate(0, 0.75, 0);
export const TANK_COLOR = '#1C1A22';

/** Builds the whole city as a handful of instanced meshes (a few draw calls). */
export function buildCity(layout: CityLayout): Group {
  const city = new Group();
  const dummy = new Object3D();
  const color = new Color();

  const blocks = new InstancedMesh(unitBox(), new MeshLambertMaterial(), layout.blocks.length);
  layout.blocks.forEach((b, i) => {
    dummy.position.set(b.x, 0, b.z);
    dummy.scale.set(b.width, b.height, b.depth);
    dummy.updateMatrix();
    blocks.setMatrixAt(i, dummy.matrix);
    blocks.setColorAt(i, color.set(b.color).offsetHSL(0, 0, b.shade));
  });
  city.add(blocks);

  const mumties = new InstancedMesh(unitBox(), new MeshLambertMaterial(), layout.mumties.length);
  layout.mumties.forEach((m, i) => {
    dummy.position.set(m.x, m.y, m.z);
    dummy.scale.set(2.8, 2.8, 3.2);
    dummy.updateMatrix();
    mumties.setMatrixAt(i, dummy.matrix);
    const block = layout.blocks[m.blockIndex];
    mumties.setColorAt(i, color.set(block?.color ?? '#C99A73').offsetHSL(0, 0, -0.06));
  });
  city.add(mumties);

  const tanks = new InstancedMesh(
    tankGeometry(),
    new MeshLambertMaterial({ color: TANK_COLOR }),
    layout.tanks.length,
  );
  layout.tanks.forEach((t, i) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    tanks.setMatrixAt(i, dummy.matrix);
  });
  city.add(tanks);

  const trees = new InstancedMesh(
    new IcosahedronGeometry(1, 0),
    new MeshLambertMaterial({ color: '#4F6B3F' }),
    layout.trees.length,
  );
  layout.trees.forEach((t, i) => {
    dummy.position.set(t.x, t.size * 1.3, t.z);
    dummy.scale.set(t.size, t.size * 1.2, t.size);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  });
  city.add(trees);

  return city;
}
