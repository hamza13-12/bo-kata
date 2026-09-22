import type { Group, Scene } from 'three';
import { Vector3 } from 'three';
import { AMBIENT_KITES } from '../config';
import type { Rng } from '../core/rng';
import { range } from '../core/rng';
import { createKiteMesh } from '../kite/kiteMesh';
import { KiteString } from '../kite/kiteString';

interface SkyKite {
  readonly mesh: Group;
  readonly line: KiteString;
  readonly base: Vector3;
  readonly anchor: Vector3;
  readonly phase: number;
  readonly swayRate: number;
  readonly bobRate: number;
}

/** Far-off kites filling the Basant sky. Scenery only: they never fight. */
export class AmbientKites {
  private readonly kites: SkyKite[] = [];

  constructor(scene: Scene, rng: Rng) {
    for (let i = 0; i < AMBIENT_KITES.count; i++) {
      const colors = AMBIENT_KITES.colors[i % AMBIENT_KITES.colors.length];
      if (!colors) continue;
      const base = new Vector3(range(rng, -280, 280), range(rng, 45, 135), range(rng, -450, -130));
      const anchor = new Vector3(
        base.x - range(rng, 30, 55),
        range(rng, 14, 20),
        base.z + range(rng, 40, 70),
      );
      const mesh = createKiteMesh(colors, range(rng, 2.4, 3.2));
      const line = new KiteString('#FBE3D6', 24);
      scene.add(mesh, line.line);
      this.kites.push({
        mesh,
        line,
        base,
        anchor,
        phase: range(rng, 0, 10),
        swayRate: range(rng, 0.2, 0.5),
        bobRate: range(rng, 0.3, 0.7),
      });
    }
  }

  update(t: number, viewer: Vector3): void {
    for (const k of this.kites) {
      k.mesh.position.set(
        k.base.x + Math.sin(t * k.swayRate + k.phase) * 7,
        k.base.y + Math.sin(t * k.bobRate + k.phase) * 3.5,
        k.base.z,
      );
      k.mesh.lookAt(viewer);
      k.mesh.rotateZ(Math.sin(t * 1.3 + k.phase) * 0.18);
      k.line.update(k.anchor, k.mesh.position, 7);
    }
  }
}
