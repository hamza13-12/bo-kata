import {
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import { TANK_COLOR, tankGeometry, unitBox } from './city';

const ROOF_HEIGHT = 12;

/** The player's own roof: parapet, charpai, water tank and a line of drying dupattas. */
export class Rooftop {
  readonly group = new Group();
  private readonly clothes: { pivot: Group; phase: number }[] = [];

  constructor() {
    const plaster = new MeshLambertMaterial({ color: '#D6B08A' });

    const house = new Mesh(unitBox(), new MeshLambertMaterial({ color: '#B89272' }));
    house.scale.set(18, ROOF_HEIGHT, 18);
    house.position.set(0, 0, 3);
    this.group.add(house);

    const wall = (w: number, d: number, x: number, z: number): void => {
      const m = new Mesh(new BoxGeometry(w, 1, d).translate(0, 0.5, 0), plaster);
      m.position.set(x, ROOF_HEIGHT, z);
      this.group.add(m);
    };
    wall(18, 0.3, 0, -6);
    wall(0.3, 18, -9, 3);
    wall(0.3, 18, 9, 3);

    this.group.add(this.buildCharpai());

    const tank = new Mesh(tankGeometry(), new MeshLambertMaterial({ color: TANK_COLOR }));
    // Behind the player, so it frames the roof without blocking the sky.
    tank.position.set(6.8, ROOF_HEIGHT, 9.5);
    tank.scale.set(1.25, 1.2, 1.25);
    this.group.add(tank);

    this.buildClothesline();
  }

  update(t: number): void {
    for (const c of this.clothes) c.pivot.rotation.x = Math.sin(t * 1.6 + c.phase) * 0.25 + 0.15;
  }

  private buildCharpai(): Group {
    const wood = new MeshLambertMaterial({ color: '#6B3F22' });
    const weave = new MeshLambertMaterial({ color: '#D9B26B' });
    const charpai = new Group();
    const bar = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      material: MeshLambertMaterial,
    ): void => {
      const m = new Mesh(new BoxGeometry(w, h, d), material);
      m.position.set(x, y, z);
      charpai.add(m);
    };
    for (const [x, z] of [
      [-0.9, -0.45],
      [0.9, -0.45],
      [-0.9, 0.45],
      [0.9, 0.45],
    ] as const) {
      bar(0.1, 0.5, 0.1, x, 0.25, z, wood);
    }
    bar(1.95, 0.08, 0.1, 0, 0.48, -0.45, wood);
    bar(1.95, 0.08, 0.1, 0, 0.48, 0.45, wood);
    bar(0.1, 0.08, 0.95, -0.95, 0.48, 0, wood);
    bar(0.1, 0.08, 0.95, 0.95, 0.48, 0, wood);
    bar(1.8, 0.03, 0.82, 0, 0.47, 0, weave);
    charpai.position.set(-3.5, ROOF_HEIGHT, -1.5);
    charpai.rotation.y = 0.35;
    return charpai;
  }

  private buildClothesline(): void {
    const a = new Vector3(-8.6, 14.2, 1.5);
    const b = new Vector3(-2.2, 14.0, -5.6);
    this.group.add(
      new Line(
        new BufferGeometry().setFromPoints([a, b]),
        new LineBasicMaterial({ color: '#3B2E2A' }),
      ),
    );
    const facing = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
    ['#E0226E', '#F5B700', '#3E6FB0', '#1F9E6B'].forEach((color, i) => {
      const pivot = new Group();
      pivot.position.copy(a).lerp(b, 0.15 + i * 0.22);
      pivot.rotation.order = 'YXZ';
      pivot.rotation.y = facing;
      const cloth = new Mesh(
        new PlaneGeometry(0.9, 1.25).translate(0, -0.62, 0),
        new MeshLambertMaterial({ color, side: DoubleSide }),
      );
      pivot.add(cloth);
      this.group.add(pivot);
      this.clothes.push({ pivot, phase: i * 1.3 });
    });
  }
}
