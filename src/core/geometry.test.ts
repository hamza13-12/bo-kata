import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { polylineDistance, segmentDistance } from './geometry';

const v = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

describe('segmentDistance', () => {
  it('is zero for crossing segments', () => {
    expect(segmentDistance(v(-1, 0, 0), v(1, 0, 0), v(0, -1, 0), v(0, 1, 0))).toBeCloseTo(0);
  });

  it('measures the gap between skew segments', () => {
    expect(segmentDistance(v(-1, 0, 0), v(1, 0, 0), v(0, -1, 2), v(0, 1, 2))).toBeCloseTo(2);
  });

  it('measures between parallel segments', () => {
    expect(segmentDistance(v(0, 0, 0), v(4, 0, 0), v(1, 3, 0), v(3, 3, 0))).toBeCloseTo(3);
  });

  it('uses endpoints when the closest approach is past a segment end', () => {
    expect(segmentDistance(v(0, 0, 0), v(1, 0, 0), v(3, 0, 0), v(4, 0, 0))).toBeCloseTo(2);
  });

  it('handles degenerate (point) segments', () => {
    expect(segmentDistance(v(0, 0, 0), v(0, 0, 0), v(0, 5, 0), v(0, 5, 0))).toBeCloseTo(5);
  });

  it('reports the closest points', () => {
    const a = new Vector3();
    const b = new Vector3();
    segmentDistance(v(-1, 0, 0), v(1, 0, 0), v(0, -1, 2), v(0, 1, 2), a, b);
    expect(a.toArray()).toEqual([0, 0, 0]);
    expect(b.toArray()).toEqual([0, 0, 2]);
  });
});

describe('polylineDistance', () => {
  const horizontal = [v(-10, 0, 0), v(0, 0, 0), v(10, 0, 0)];

  it('finds where two lines cross', () => {
    const vertical = [v(2, -10, 0), v(2, 0, 0), v(2, 10, 0)];
    const contact = polylineDistance(horizontal, vertical);
    expect(contact.distance).toBeCloseTo(0);
    expect(contact.point.x).toBeCloseTo(2);
  });

  it('ignores the skipped start of a line', () => {
    const crossingNearStart = [v(-8, -5, 0), v(-8, 5, 0), v(-8, 5, 20)];
    expect(polylineDistance(horizontal, crossingNearStart).distance).toBeCloseTo(0);
    expect(polylineDistance(horizontal, crossingNearStart, 0.5).distance).toBeGreaterThan(5);
  });
});
