import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { KITE_PHYSICS } from '../config';
import { createRng } from '../core/rng';
import { KiteBody } from '../kite/physics';
import { RivalBrain } from './rivalBrain';

const playerLine = Array.from({ length: 11 }, (_, i) => new Vector3(0, 12 + i * 4, -i * 7));
const playerKite = playerLine[playerLine.length - 1] ?? new Vector3();

function rival(): KiteBody {
  return new KiteBody(new Vector3(60, 14, -40), new Vector3(40, 50, -80), 70);
}

describe('RivalBrain', () => {
  it('a cautious flyer keeps its distance from a far kite', () => {
    const brain = new RivalBrain('cautious', new Vector3(45, 55, -85), createRng(1));
    brain.think({ self: rival(), playerLine, playerKite, hooked: false, dt: 0.1 });
    expect(brain.attacking).toBe(false);
  });

  it('a cautious flyer fights when you come close', () => {
    const brain = new RivalBrain('cautious', new Vector3(45, 55, -85), createRng(1));
    const self = rival();
    brain.think({ self, playerLine, playerKite: self.position, hooked: false, dt: 0.1 });
    expect(brain.attacking).toBe(true);
  });

  it('an aggressive flyer attacks after a short wait', () => {
    const brain = new RivalBrain('aggressive', new Vector3(45, 55, -85), createRng(1));
    const self = rival();
    for (let i = 0; i < 50; i++) {
      brain.think({ self, playerLine, playerKite, hooked: false, dt: 0.1 });
    }
    expect(brain.attacking).toBe(true);
  });

  it('attacks by steering its line across the player’s line', () => {
    const brain = new RivalBrain('aggressive', new Vector3(45, 55, -85), createRng(1));
    const self = rival();
    brain.think({ self, playerLine, playerKite, hooked: false, dt: 5 });
    const input = brain.think({ self, playerLine, playerKite, hooked: false, dt: 0.1 });
    const cross = playerLine[7] ?? new Vector3();
    const toCross = cross.clone().sub(self.anchor).normalize();
    const toTarget = input.target.clone().sub(self.anchor).normalize();
    expect(toTarget.dot(toCross)).toBeGreaterThan(0.99);
  });

  it('an aggressive flyer gives dheel in a pecha until its line runs short', () => {
    const brain = new RivalBrain('aggressive', new Vector3(45, 55, -85), createRng(1));
    const self = rival();
    expect(brain.think({ self, playerLine, playerKite, hooked: true, dt: 0.1 }).pull).toBe(false);
    self.lineLength = KITE_PHYSICS.maxLine - 2;
    expect(brain.think({ self, playerLine, playerKite, hooked: true, dt: 0.1 }).pull).toBe(true);
  });
});
