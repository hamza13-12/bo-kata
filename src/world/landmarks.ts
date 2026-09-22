import type { BufferGeometry, Material } from 'three';
import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
} from 'three';
import { LANDMARKS } from '../config';

function place(
  group: Group,
  geometry: BufferGeometry,
  material: Material,
  x: number,
  y: number,
  z: number,
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

/** Badshahi Mosque: red sandstone prayer hall, three marble domes, four tall minarets. */
export function buildBadshahiMosque(): Group {
  const g = new Group();
  const stone = new MeshLambertMaterial({ color: '#9A4E3C' });
  const marble = new MeshLambertMaterial({ color: '#F1E6D6' });

  place(g, new BoxGeometry(160, 5, 96).translate(0, 2.5, 0), stone, 0, 0, 0);
  place(g, new BoxGeometry(104, 20, 26).translate(0, 10, 0), stone, 0, 5, -28);
  place(g, new BoxGeometry(28, 32, 5).translate(0, 16, 0), stone, 0, 5, -14);

  const dome = (radius: number, x: number): void => {
    place(
      g,
      new CylinderGeometry(radius * 0.85, radius * 0.85, 5, 24).translate(0, 2.5, 0),
      marble,
      x,
      25,
      -30,
    );
    const shell = place(
      g,
      new SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      marble,
      x,
      30,
      -30,
    );
    shell.scale.y = 1.3;
    place(g, new ConeGeometry(0.9, 6, 8).translate(0, 3, 0), marble, x, 29.5 + radius * 1.3, -30);
  };
  dome(13, 0);
  dome(9, -30);
  dome(9, 30);

  const minaret = (x: number, z: number, height: number, radius: number): void => {
    place(
      g,
      new CylinderGeometry(radius * 0.85, radius, height, 8).translate(0, height / 2, 0),
      stone,
      x,
      5,
      z,
    );
    for (const f of [0.35, 0.62, 0.88]) {
      place(
        g,
        new CylinderGeometry(radius * 1.45, radius * 1.2, 0.9, 8),
        marble,
        x,
        5 + height * f,
        z,
      );
    }
    place(
      g,
      new CylinderGeometry(radius * 0.9, radius * 0.9, 3.2, 8).translate(0, 1.6, 0),
      marble,
      x,
      5 + height,
      z,
    );
    place(
      g,
      new SphereGeometry(radius * 1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      marble,
      x,
      8.2 + height,
      z,
    );
  };
  for (const [x, z] of [
    [-76, -44],
    [76, -44],
    [-76, 44],
    [76, 44],
  ] as const) {
    minaret(x, z, 52, 2.6);
  }
  minaret(-52, -16, 24, 1.4);
  minaret(52, -16, 24, 1.4);

  g.position.set(LANDMARKS.badshahi.x, 0, LANDMARKS.badshahi.z);
  g.rotation.y = 0.12;
  return g;
}

/** Minar-e-Pakistan in its park: flared base, tapering white shaft, two balconies. */
export function buildMinarEPakistan(): Group {
  const g = new Group();
  const white = new MeshLambertMaterial({ color: '#EFE8DE' });

  const park = new Mesh(
    new CircleGeometry(LANDMARKS.minar.clearRadius - 2, 40).rotateX(-Math.PI / 2),
    new MeshLambertMaterial({ color: '#5E7A4A' }),
  );
  park.position.y = 0.05;
  g.add(park);

  const stack = (geometry: BufferGeometry, y: number): Mesh => place(g, geometry, white, 0, y, 0);
  stack(new CylinderGeometry(20, 22, 3, 10).translate(0, 1.5, 0), 0);
  stack(new CylinderGeometry(6.5, 13, 14, 4).translate(0, 7, 0), 3).rotation.y = Math.PI / 4;
  stack(new CylinderGeometry(2.6, 5.4, 46, 16).translate(0, 23, 0), 17);
  stack(new CylinderGeometry(5.2, 4.2, 1.4, 16), 38);
  stack(new CylinderGeometry(3.8, 3.0, 1.2, 16), 62);
  stack(new CylinderGeometry(2.4, 2.4, 3, 12).translate(0, 1.5, 0), 63);
  stack(new SphereGeometry(2.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 66);
  stack(new ConeGeometry(0.4, 4, 6).translate(0, 2, 0), 68.4);

  g.position.set(LANDMARKS.minar.x, 0, LANDMARKS.minar.z);
  return g;
}
