import { describe, expect, it } from 'vitest';

import {
  indexFromRatio,
  labelStride,
  strokeWidthFor,
  toPoints,
  valueAt,
  xAt,
} from './chartGeometry';

describe('chartGeometry', () => {
  it('spreads points across 0..1000', () => {
    expect(xAt(0, 5)).toBe(0);
    expect(xAt(2, 5)).toBe(500);
    expect(xAt(4, 5)).toBe(1000);
    expect(xAt(1.5, 4)).toBe(500);
  });

  it('builds polyline points with y flipped', () => {
    expect(toPoints([0, 50, 100], { min: 0, max: 100 })).toBe(
      '0.00 1000.00 500.00 500.00 1000.00 0.00'
    );
  });

  it('thins the line as the points get dense', () => {
    expect([2, 40].map(strokeWidthFor)).toEqual([2.5, 2.5]);
    expect([41, 80].map(strokeWidthFor)).toEqual([2, 2]);
    expect([81, 150].map(strokeWidthFor)).toEqual([1.5, 1.5]);
    expect([151, 200, 5000].map(strokeWidthFor)).toEqual([1, 1, 1]);
  });

  describe('drawing more points than the plot has room for', () => {
    const domain = { min: 0, max: 100 };
    const pairs = (points) =>
      points.split(' ').reduce((all, _, i, parts) => {
        if (i % 2 === 0) all.push([Number(parts[i]), Number(parts[i + 1])]);
        return all;
      }, []);
    // A slow wave with one spike and one dip hidden in the middle.
    const values = Array.from(
      { length: 3000 },
      (_, i) => 50 + 20 * Math.sin(i / 200)
    );
    values[1234] = 100;
    values[2345] = 0;

    it('keeps every point while they fit', () => {
      const all = toPoints(values.slice(0, 100), domain, 200);
      expect(pairs(all)).toHaveLength(100);
    });

    it('draws at most two points per bucket plus the ends', () => {
      expect(pairs(toPoints(values, domain, 300)).length).toBeLessThanOrEqual(
        2 * 300 + 2
      );
    });

    it('keeps the first and last points and the extreme spikes in place', () => {
      const drawn = pairs(toPoints(values, domain, 300));
      expect(drawn[0][0]).toBe(0);
      expect(drawn[drawn.length - 1][0]).toBe(1000);
      const spike = drawn.find(([, y]) => y === 0);
      const dip = drawn.find(([, y]) => y === 1000);
      expect(spike[0]).toBeCloseTo(xAt(1234, 3000), 1);
      expect(dip[0]).toBeCloseTo(xAt(2345, 3000), 1);
    });

    it('keeps the points in order of position', () => {
      const xs = pairs(toPoints(values, domain, 300)).map(([x]) => x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
    });
  });

  it('picks the nearest index for a pointer ratio, clamped', () => {
    expect(indexFromRatio(0.5, 5)).toBe(2);
    expect(indexFromRatio(0.62, 5)).toBe(2);
    expect(indexFromRatio(0.63, 5)).toBe(3);
    expect(indexFromRatio(-1, 5)).toBe(0);
    expect(indexFromRatio(2, 5)).toBe(4);
  });

  it('interpolates between neighbouring values', () => {
    expect(valueAt([10, 20, 40], 0)).toBe(10);
    expect(valueAt([10, 20, 40], 1.5)).toBe(30);
    expect(valueAt([10, 20, 40], 2)).toBe(40);
    expect(valueAt([10, 20, 40], 5)).toBe(40);
  });

  it('thins x labels so they fit the width', () => {
    expect(labelStride(23, 700)).toBe(3);
    expect(labelStride(5, 700)).toBe(1);
    expect(labelStride(23, 200)).toBe(8);
  });
});
