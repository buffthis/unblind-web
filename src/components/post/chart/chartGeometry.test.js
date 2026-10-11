import { describe, expect, it } from 'vitest';

import {
  indexFromRatio,
  labelStride,
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
