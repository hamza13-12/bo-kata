import {
  Group,
  InstancedMesh,
  MathUtils,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Rng } from '../core/rng';
import type { CityLayout } from './cityLayout';

const BULB_COLORS = ['#FFD27A', '#FF6B9A', '#7AE0FF', '#FFF4E0'];
const BULBS_PER_STRING = 9;
/** Share of rooftops that have strung up lights for Basant night. */
const LIT_ROOFS = 0.14;
const POLE_HEIGHT = 2.2;

/** Strings of coloured bulbs across the rooftops that glow as night falls. */
export class RooftopLights {
  readonly group = new Group();
  private readonly materials: MeshBasicMaterial[] = [];

  constructor(layout: CityLayout, rng: Rng) {
    const strings: [Vector3, Vector3, number][] = [
      // Your own roof: along the front parapet and down the left side.
      [new Vector3(-8.6, 15.1, -5.7), new Vector3(8.6, 14.9, -5.7), 16],
      [new Vector3(-8.8, 14.8, -5.5), new Vector3(-8.8, 14.6, 11), 10],
    ];
    for (const b of layout.blocks) {
      const distance = Math.hypot(b.x, b.z);
      if (distance < 20 || distance > 360 || rng() > LIT_ROOFS) continue;
      const flip = rng() < 0.5 ? 1 : -1;
      const y = b.height + POLE_HEIGHT;
      strings.push([
        new Vector3(b.x - b.width / 2 + 0.3, y, b.z - flip * (b.depth / 2 - 0.3)),
        new Vector3(b.x + b.width / 2 - 0.3, y, b.z + flip * (b.depth / 2 - 0.3)),
        BULBS_PER_STRING,
      ]);
    }

    const positions: Vector3[][] = BULB_COLORS.map(() => []);
    for (const [a, b, count] of strings) {
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const p = new Vector3().lerpVectors(a, b, t);
        p.y -= 0.8 * 4 * t * (1 - t);
        positions[i % BULB_COLORS.length]?.push(p);
      }
    }

    const geometry = new SphereGeometry(0.32, 6, 4);
    const dummy = new Object3D();
    BULB_COLORS.forEach((color, c) => {
      const list = positions[c] ?? [];
      const material = new MeshBasicMaterial({ color, transparent: true, opacity: 0 });
      const mesh = new InstancedMesh(geometry, material, list.length);
      list.forEach((p, i) => {
        dummy.position.copy(p);
        // Nearby bulbs are real-bulb sized; far ones are enlarged so they still read as lights.
        dummy.scale.setScalar(MathUtils.clamp(Math.hypot(p.x, p.z) / 70, 0.22, 1));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      this.materials.push(material);
      this.group.add(mesh);
    });
    this.group.visible = false;
  }

  setNight(level: number): void {
    const glow = MathUtils.smoothstep(level, 0.25, 0.75);
    this.group.visible = glow > 0.01;
    for (const m of this.materials) m.opacity = glow;
  }
}
