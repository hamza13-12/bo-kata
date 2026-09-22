import type { ColorRepresentation } from 'three';
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';

/**
 * Samples a sagging kite line from `a` (the flyer) to `b` (the kite) into
 * `out`. The sag is heavier near the flyer, like a real dor.
 */
export function sampleSaggingLine(a: Vector3, b: Vector3, sag: number, out: Vector3[]): void {
  const n = out.length - 1;
  out.forEach((p, i) => {
    const t = i / n;
    p.lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t) * (1.15 - 0.3 * t);
  });
}

/** A kite line: the sampled points (used for pecha contact) plus the drawn line. */
export class KiteString {
  readonly points: Vector3[];
  readonly line: Line;
  private readonly material: LineBasicMaterial;
  private readonly positions: BufferAttribute;

  constructor(color: ColorRepresentation, segments: number) {
    this.points = Array.from({ length: segments + 1 }, () => new Vector3());
    this.positions = new BufferAttribute(new Float32Array((segments + 1) * 3), 3);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    this.material = new LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    this.line = new Line(geometry, this.material);
    this.line.frustumCulled = false;
  }

  update(a: Vector3, b: Vector3, sag: number): void {
    sampleSaggingLine(a, b, sag, this.points);
    this.points.forEach((p, i) => this.positions.setXYZ(i, p.x, p.y, p.z));
    this.positions.needsUpdate = true;
  }

  set opacity(value: number) {
    this.material.opacity = value;
    this.line.visible = value > 0.01;
  }

  set visible(value: boolean) {
    this.line.visible = value;
  }

  dispose(): void {
    this.line.geometry.dispose();
    this.material.dispose();
    this.line.removeFromParent();
  }
}
