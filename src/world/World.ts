import type { Scene, Vector3 } from 'three';
import { Mesh, MeshLambertMaterial, PlaneGeometry } from 'three';
import type { Rng } from '../core/rng';
import { AmbientKites } from './ambientKites';
import { buildCity } from './city';
import type { Block } from './cityLayout';
import { flyerRooftops, generateCityLayout } from './cityLayout';
import { buildBadshahiMosque, buildMinarEPakistan } from './landmarks';
import { Pigeons } from './pigeons';
import { Rooftop } from './rooftop';
import { addSkyAndLight } from './sky';

/** Everything in the scene that isn't a fighting kite. */
export class World {
  /** Roofs where rivals can stand to fly. */
  readonly flyerRooftops: readonly Block[];
  private readonly rooftop = new Rooftop();
  private readonly pigeons: Pigeons;
  private readonly ambientKites: AmbientKites;

  constructor(scene: Scene, rng: Rng) {
    addSkyAndLight(scene);

    const ground = new Mesh(
      new PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2),
      new MeshLambertMaterial({ color: '#7A5443' }),
    );
    scene.add(ground);

    const layout = generateCityLayout(rng);
    this.flyerRooftops = flyerRooftops(layout);
    scene.add(buildCity(layout), buildBadshahiMosque(), buildMinarEPakistan(), this.rooftop.group);

    this.pigeons = new Pigeons(26, rng);
    scene.add(this.pigeons.group);
    this.ambientKites = new AmbientKites(scene, rng);
  }

  update(t: number, viewer: Vector3, animateCloth: boolean): void {
    if (animateCloth) this.rooftop.update(t);
    this.pigeons.update(t);
    this.ambientKites.update(t, viewer);
  }
}
