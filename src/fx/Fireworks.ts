import type { ColorRepresentation, Texture } from 'three';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  NormalBlending,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';
import { FIREWORKS } from '../config';

/**
 * firework – a bright additive shell that bursts and droops.
 * paper    – shreds of kite paper that flutter down after a cut.
 */
export type BurstKind = 'firework' | 'paper';

interface BurstStyle {
  readonly speed: readonly [number, number];
  readonly lift: number;
  readonly gravity: number;
  readonly drag: number;
  readonly life: number;
  readonly size: number;
  readonly additive: boolean;
}

const STYLES: Record<BurstKind, BurstStyle> = {
  firework: {
    speed: [12, 20],
    lift: 0,
    gravity: 5,
    drag: 1.3,
    life: 2.4,
    size: 2,
    additive: true,
  },
  paper: { speed: [3, 8], lift: 3, gravity: 1.4, drag: 2.2, life: 3.2, size: 0.9, additive: false },
};

interface Burst {
  readonly points: Points;
  readonly material: PointsMaterial;
  readonly positions: BufferAttribute;
  readonly colors: BufferAttribute;
  readonly velocities: Float32Array;
  style: BurstStyle;
  age: number;
  active: boolean;
}

interface Pending {
  delay: number;
  readonly at: Vector3;
  readonly colors: readonly ColorRepresentation[];
  readonly kind: BurstKind;
  readonly scale: number;
}

/** Soft round sprite so particles read as glowing dots, not squares. */
function glowTexture(): Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

/** A pooled particle system for fireworks and kite-paper confetti. */
export class Fireworks {
  readonly group = new Group();
  private readonly pool: Burst[] = [];
  private readonly pending: Pending[] = [];
  private readonly color = new Color();
  private readonly direction = new Vector3();

  constructor() {
    const texture = glowTexture();
    const n = FIREWORKS.particles;
    for (let i = 0; i < FIREWORKS.poolSize; i++) {
      const geometry = new BufferGeometry();
      const positions = new BufferAttribute(new Float32Array(n * 3), 3);
      const colors = new BufferAttribute(new Float32Array(n * 3), 3);
      geometry.setAttribute('position', positions);
      geometry.setAttribute('color', colors);
      const material = new PointsMaterial({
        size: 1,
        map: texture,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      });
      const points = new Points(geometry, material);
      points.frustumCulled = false;
      points.visible = false;
      this.group.add(points);
      this.pool.push({
        points,
        material,
        positions,
        colors,
        velocities: new Float32Array(n * 3),
        style: STYLES.firework,
        age: 0,
        active: false,
      });
    }
  }

  /** Queues a burst `delay` seconds from now. */
  burst(
    at: Vector3,
    colors: readonly ColorRepresentation[],
    kind: BurstKind = 'firework',
    delay = 0,
    scale = 1,
  ): void {
    this.pending.push({ delay, at: at.clone(), colors, kind, scale });
  }

  update(dt: number): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (!p) continue;
      p.delay -= dt;
      if (p.delay <= 0) {
        this.launch(p);
        this.pending.splice(i, 1);
      }
    }

    for (const b of this.pool) {
      if (!b.active) continue;
      b.age += dt;
      const { gravity, drag, life } = b.style;
      const damping = Math.exp(-drag * dt);
      const pos = b.positions.array as Float32Array;
      const vel = b.velocities;
      for (let i = 0; i < vel.length; i += 3) {
        vel[i] = (vel[i] ?? 0) * damping;
        vel[i + 1] = (vel[i + 1] ?? 0) * damping - gravity * dt;
        vel[i + 2] = (vel[i + 2] ?? 0) * damping;
        pos[i] = (pos[i] ?? 0) + (vel[i] ?? 0) * dt;
        pos[i + 1] = (pos[i + 1] ?? 0) + (vel[i + 1] ?? 0) * dt;
        pos[i + 2] = (pos[i + 2] ?? 0) + (vel[i + 2] ?? 0) * dt;
      }
      b.positions.needsUpdate = true;
      // Stay bright, then die away fast at the end, like a real shell.
      const progress = b.age / life;
      b.material.opacity = Math.max(0, 1 - progress * progress * progress);
      if (b.age >= life) {
        b.active = false;
        b.points.visible = false;
      }
    }
  }

  private launch(p: Pending): void {
    // Reuse a free slot, or the oldest burst if the sky is very busy.
    const burst =
      this.pool.find((b) => !b.active) ??
      this.pool.reduce((oldest, b) => (b.age > oldest.age ? b : oldest));
    const style = STYLES[p.kind];
    burst.style = style;
    burst.age = 0;
    burst.active = true;
    burst.points.visible = true;
    burst.material.size = style.size * p.scale;
    burst.material.blending = style.additive ? AdditiveBlending : NormalBlending;
    burst.material.opacity = 1;
    burst.material.needsUpdate = true;

    const pos = burst.positions.array as Float32Array;
    const col = burst.colors.array as Float32Array;
    const vel = burst.velocities;
    const [minSpeed, maxSpeed] = style.speed;
    for (let i = 0; i < vel.length / 3; i++) {
      // Uniform direction on a sphere.
      const u = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      this.direction.set(r * Math.cos(theta), u, r * Math.sin(theta));
      const speed = (minSpeed + Math.random() * (maxSpeed - minSpeed)) * p.scale;
      vel[i * 3] = this.direction.x * speed;
      vel[i * 3 + 1] = this.direction.y * speed + style.lift;
      vel[i * 3 + 2] = this.direction.z * speed;
      pos[i * 3] = p.at.x;
      pos[i * 3 + 1] = p.at.y;
      pos[i * 3 + 2] = p.at.z;
      const choice = p.colors[i % Math.max(1, p.colors.length)] ?? '#FFFFFF';
      this.color.set(choice);
      col[i * 3] = this.color.r;
      col[i * 3 + 1] = this.color.g;
      col[i * 3 + 2] = this.color.b;
    }
    burst.positions.needsUpdate = true;
    burst.colors.needsUpdate = true;
  }
}
