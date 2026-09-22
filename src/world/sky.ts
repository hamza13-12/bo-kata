import type { Scene } from 'three';
import {
  BackSide,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { NIGHT_SKY, SKY } from '../config';
import type { SkyColors } from './timeOfDay';
import { lightLevelsAt, skyColorsAt } from './timeOfDay';

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 top;
  uniform vec3 middle;
  uniform vec3 horizon;
  uniform vec3 sunDir;
  uniform vec3 moonDir;
  uniform float night;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    float h = vDir.y;
    vec3 c = mix(horizon, middle, smoothstep(0.0, 0.22, h));
    c = mix(c, top, smoothstep(0.2, 0.75, h));

    // The sun sets as night comes in.
    float day = 1.0 - night;
    float s = max(dot(vDir, sunDir), 0.0);
    c += vec3(1.0, 0.72, 0.35) * pow(s, 18.0) * 0.45 * day;
    c = mix(c, vec3(1.0, 0.93, 0.75), smoothstep(0.9982, 0.9990, s) * day);

    // Stars and moon come out.
    float star = step(0.9972, hash(floor(vDir * 320.0))) * smoothstep(0.04, 0.35, h);
    c += vec3(star) * night * 0.9;
    float m = max(dot(vDir, moonDir), 0.0);
    c += vec3(0.75, 0.8, 1.0) * pow(m, 60.0) * 0.25 * night;
    c = mix(c, vec3(1.0, 0.97, 0.88), smoothstep(0.99935, 0.99955, m) * night);

    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

export const SUN_DIRECTION = new Vector3(...SKY.sunDirection).normalize();
const MOON_DIRECTION = new Vector3(...NIGHT_SKY.moonDirection).normalize();

/** Sky dome, haze and lighting, fading from golden hour into a starry Basant night. */
export class Sky {
  private readonly material: ShaderMaterial;
  private readonly fog: Fog;
  private readonly hemisphere = new HemisphereLight('#FFD3B4', '#5A3A44');
  private readonly sun = new DirectionalLight('#FFAE6A');
  /** Warm fill from behind the player; turns moonlit at night. */
  private readonly fill = new DirectionalLight('#C58FB0');
  private readonly colors: SkyColors = {
    top: new Color(),
    middle: new Color(),
    horizon: new Color(),
    fog: new Color(),
  };
  private readonly dayFill = new Color('#C58FB0');
  private readonly moonFill = new Color('#8FA0FF');

  constructor(scene: Scene) {
    this.fog = new Fog(SKY.fog, SKY.fogNear, SKY.fogFar);
    scene.fog = this.fog;

    this.material = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: this.colors.top },
        middle: { value: this.colors.middle },
        horizon: { value: this.colors.horizon },
        sunDir: { value: SUN_DIRECTION },
        moonDir: { value: MOON_DIRECTION },
        night: { value: 0 },
      },
      vertexShader,
      fragmentShader,
    });
    const dome = new Mesh(new SphereGeometry(1200, 32, 16), this.material);
    dome.renderOrder = -1;
    scene.add(dome);

    this.sun.position.copy(SUN_DIRECTION).multiplyScalar(200);
    this.fill.position.set(0.5, 0.6, 1);
    scene.add(this.hemisphere, this.sun, this.fill);

    this.setNight(0);
  }

  setNight(level: number): void {
    skyColorsAt(level, this.colors);
    this.fog.color.copy(this.colors.fog);
    const uniform = this.material.uniforms.night;
    if (uniform) uniform.value = level;

    const light = lightLevelsAt(level);
    this.hemisphere.intensity = light.hemisphere;
    this.sun.intensity = light.sun;
    this.fill.intensity = light.fill;
    this.fill.color.lerpColors(this.dayFill, this.moonFill, level);
  }
}
