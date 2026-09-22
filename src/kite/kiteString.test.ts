import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { sampleSaggingLine } from './kiteString';

describe('sampleSaggingLine', () => {
  const a = new Vector3(0, 0, 0);
  const b = new Vector3(0, 0, -100);

  it('starts at the flyer and ends at the kite', () => {
    const points = Array.from({ length: 11 }, () => new Vector3());
    sampleSaggingLine(a, b, 5, points);
    expect(points[0]?.toArray()).toEqual([0, 0, 0]);
    expect(points[10]?.toArray()).toEqual([0, 0, -100]);
  });

  it('sags below the straight line in between', () => {
    const points = Array.from({ length: 11 }, () => new Vector3());
    sampleSaggingLine(a, b, 5, points);
    for (const p of points.slice(1, -1)) expect(p.y).toBeLessThan(0);
  });

  it('is straight with no sag', () => {
    const points = Array.from({ length: 5 }, () => new Vector3());
    sampleSaggingLine(a, b, 0, points);
    for (const p of points) expect(p.y).toBe(0);
  });
});
