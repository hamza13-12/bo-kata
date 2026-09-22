import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';

interface Pigeon {
  readonly body: Group;
  readonly left: Mesh;
  readonly right: Mesh;
  readonly phase: number;
  readonly radius: number;
  readonly height: number;
  readonly speed: number;
}

/** A flock of kabootar wheeling over the rooftops, as they do every evening. */
export class Pigeons {
  readonly group = new Group();
  private readonly birds: Pigeon[] = [];
  private readonly centre = new Vector3();
  private readonly next = new Vector3();
  private readonly ahead = new Vector3();

  constructor(count: number, rng: () => number) {
    const wing = new BufferGeometry();
    wing.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0.3, 0, 0, -0.3, 1.1, 0, -0.05], 3),
    );
    const material = new MeshBasicMaterial({ color: '#3A2A3A', side: DoubleSide });

    for (let i = 0; i < count; i++) {
      const body = new Group();
      const left = new Mesh(wing, material);
      const right = new Mesh(wing, material);
      right.scale.x = -1;
      body.add(left, right);
      body.scale.setScalar(1.4);
      this.group.add(body);
      this.birds.push({
        body,
        left,
        right,
        phase: rng() * Math.PI * 2,
        radius: 4 + rng() * 10,
        height: (rng() - 0.5) * 8,
        speed: 0.8 + rng() * 0.4,
      });
    }
  }

  update(t: number): void {
    this.centre.set(
      25 + 45 * Math.cos(t * 0.12),
      42 + 6 * Math.sin(t * 0.3),
      -110 + 30 * Math.sin(t * 0.12),
    );
    for (const bird of this.birds) {
      const angle = t * bird.speed * 0.9 + bird.phase;
      this.next.set(
        this.centre.x + bird.radius * Math.cos(angle),
        this.centre.y + bird.height + Math.sin(t + bird.phase) * 2,
        this.centre.z + bird.radius * Math.sin(angle),
      );
      // Face the direction of travel: look past the new point, away from the old one.
      const from = bird.body.position;
      this.ahead.copy(this.next).multiplyScalar(2).sub(from);
      from.copy(this.next);
      bird.body.lookAt(this.ahead);
      const flap = Math.sin(t * 13 * bird.speed + bird.phase) * 0.7;
      bird.left.rotation.z = flap;
      bird.right.rotation.z = -flap;
    }
  }
}
