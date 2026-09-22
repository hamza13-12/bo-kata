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
import { RooftopLights } from './rooftopLights';
import { Sky } from './sky';

/** Everything in the scene that isn't a fighting kite. */
export class World {
  /** Roofs where rivals can stand to fly. */
  readonly flyerRooftops: readonly Block[];
  private readonly sky: Sky;
  private readonly rooftop = new Rooftop();
  private readonly lights: RooftopLights;
  private readonly pigeons: Pigeons;
  private readonly ambientKites: AmbientKites;

  constructor(scene: Scene, rng: Rng) {
    this.sky = new Sky(scene);

    const ground = new Mesh(
      new PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2),
      new MeshLambertMaterial({ color: '#7A5443' }),
    );
    scene.add(ground);

    const layout = generateCityLayout(rng);
    this.flyerRooftops = flyerRooftops(layout);
    this.lights = new RooftopLights(layout, rng);
    scene.add(
      buildCity(layout),
      buildBadshahiMosque(),
      buildMinarEPakistan(),
      this.rooftop.group,
      this.lights.group,
    );

    this.pigeons = new Pigeons(26, rng);
    scene.add(this.pigeons.group);
    this.ambientKites = new AmbientKites(scene, rng);
  }

  /** 0 = golden hour, 1 = full night. */
  setNight(level: number): void {
    this.sky.setNight(level);
    this.lights.setNight(level);
    // Pigeons go home to roost after dark.
    this.pigeons.group.visible = level < 0.7;
  }

  update(t: number, viewer: Vector3, animateCloth: boolean): void {
    if (animateCloth) this.rooftop.update(t);
    this.pigeons.update(t);
    this.ambientKites.update(t, viewer);
  }
}
