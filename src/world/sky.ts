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
import { SKY } from '../config';

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
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 c = mix(horizon, middle, smoothstep(0.0, 0.22, h));
    c = mix(c, top, smoothstep(0.2, 0.75, h));
    float s = max(dot(vDir, sunDir), 0.0);
    c += vec3(1.0, 0.72, 0.35) * pow(s, 18.0) * 0.45;
    c = mix(c, vec3(1.0, 0.93, 0.75), smoothstep(0.9982, 0.9990, s));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

export const SUN_DIRECTION = new Vector3(...SKY.sunDirection).normalize();

/** Golden-hour Basant sky: gradient dome, low sun, warm haze and lighting. */
export function addSkyAndLight(scene: Scene): void {
  scene.fog = new Fog(SKY.fog, SKY.fogNear, SKY.fogFar);

  const dome = new Mesh(
    new SphereGeometry(1200, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new Color(SKY.top) },
        middle: { value: new Color(SKY.middle) },
        horizon: { value: new Color(SKY.horizon) },
        sunDir: { value: SUN_DIRECTION },
      },
      vertexShader,
      fragmentShader,
    }),
  );
  dome.renderOrder = -1;
  scene.add(dome);

  scene.add(new HemisphereLight('#FFD3B4', '#5A3A44', 2.4));
  const sun = new DirectionalLight('#FFAE6A', 2.8);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(200);
  scene.add(sun);
  const fill = new DirectionalLight('#C58FB0', 1.0);
  fill.position.set(0.5, 0.6, 1);
  scene.add(fill);
}
