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

  it('stops a line at its last value and keeps the x positions of the full table', () => {
    const domain = { min: 0, max: 100 };
    expect(toPoints([0, 50, null, null, null], domain)).toBe(
      '0.00 1000.00 250.00 500.00'
    );
  });

  it('thins only the part of a line that has values', () => {
    const domain = { min: 0, max: 100 };
    const values = [
      ...Array.from({ length: 1000 }, (_, i) => (i * 7) % 100),
      ...Array.from({ length: 1000 }, () => null),
    ];
    const drawn = toPoints(values, domain, 100)
      .split(' ')
      .reduce(
        (acc, _, i, all) => (i % 2 ? acc : [...acc, [+all[i], +all[i + 1]]]),
        []
      );
    expect(drawn.length).toBeLessThanOrEqual(100 * 2 + 2);
    expect(drawn[drawn.length - 1][0]).toBeCloseTo(xAt(999, 2000), 1);
  });

  it('has no value past the end of a line that ended early', () => {
    expect(valueAt([10, 20, null, null], 1)).toBe(20);
    expect(valueAt([10, 20, null, null], 1.5)).toBeNull();
    expect(valueAt([10, 20, null, null], 3)).toBeNull();
    expect(valueAt([10, 20, 40, null], 1.5)).toBe(30);
  });

  it('interpolates between neighbouring values', () => {
    expect(valueAt([10, 20, 40], 0)).toBe(10);
    expect(valueAt([10, 20, 40], 1.5)).toBe(30);
    expect(valueAt([10, 20, 40], 2)).toBe(40);
    expect(valueAt([10, 20, 40], 5)).toBe(40);
  });

  describe('which rows get an x label', () => {
    it('labels every row while they fit', () => {
      expect(labelStride(5, 700)).toBe(1);
      expect(labelStride(10, 700)).toBe(1);
    });

    it('steps by a round number of rows, so the labels land on round places', () => {
      // 23 rows in 700px fit about 10 labels: every third row.
      expect(labelStride(23, 700)).toBe(3);
      expect(labelStride(28, 700)).toBe(3);
      expect(labelStride(100, 700)).toBe(10);
      expect(labelStride(23, 200)).toBe(10);
    });

    it('steps by minutes of seconds for a second-by-second series, not by 183 rows', () => {
      // 1,621 rows is 27 minutes at a row a second. 180 rows is 3 minutes: 0, 3, 6, ...
      expect(labelStride(1621, 700)).toBe(180);
      // On a narrow screen it steps by 10 minutes, not by 500 rows, which would be 8:20.
      expect(labelStride(1621, 330)).toBe(600);
    });

    it('never labels more rows than fit, whatever the count and width', () => {
      for (const count of [2, 7, 28, 41, 100, 365, 1621, 5000, 100000]) {
        for (const width of [200, 330, 700, 1000, 1400]) {
          const fit = Math.max(2, Math.floor(width / 64));
          const stride = labelStride(count, width);
          expect(Math.ceil(count / stride)).toBeLessThanOrEqual(fit);
        }
      }
    });

    it('only ever picks a step from the round ones', () => {
      const round = new Set([
        1, 2, 3, 5, 6, 10, 12, 15, 20, 30, 60, 90, 120, 180, 240, 300, 600, 900,
        1800, 3600, 7200, 10800, 21600, 43200, 86400,
      ]);
      for (const count of [2, 7, 28, 41, 100, 365, 1621, 5000, 100000]) {
        for (const width of [200, 330, 700, 1000, 1400]) {
          expect(round.has(labelStride(count, width))).toBe(true);
        }
      }
    });

    it('steps by the least round number that fits, so the labels are no sparser than needed', () => {
      // 365 rows in 700px fit 10 labels, which needs a step of 37 rows or more: 60.
      expect(labelStride(365, 700)).toBe(60);
    });
  });
});
