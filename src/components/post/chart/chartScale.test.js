import { describe, expect, it } from 'vitest';

import { computeDomain, formatValue, niceStep } from './chartScale';

describe('niceStep', () => {
  it('picks 1, 2, 2.5 or 5 times a power of ten for about four steps', () => {
    expect(niceStep(87)).toBe(25);
    expect(niceStep(0.8)).toBe(0.2);
    expect(niceStep(7)).toBe(2);
    expect(niceStep(3400)).toBe(1000);
  });
});

describe('computeDomain', () => {
  it.each([
    [[0, 87], {}, { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] }],
    [[0.3, 0.8], {}, { min: 0, max: 0.8, ticks: [0, 0.2, 0.4, 0.6, 0.8] }],
    [[-30, 50], {}, { min: -40, max: 60, ticks: [-40, -20, 0, 20, 40, 60] }],
    [[0, 0], {}, { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] }],
    [[5, 7], {}, { min: 0, max: 8, ticks: [0, 2, 4, 6, 8] }],
    [
      [10, 20],
      { min: 0, max: 100 },
      { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] },
    ],
    [
      [50, 50],
      { min: 50 },
      { min: 50, max: 51, ticks: [50, 50.25, 50.5, 50.75, 51] },
    ],
  ])('maps %j with %j to %j', (values, settings, expected) => {
    expect(computeDomain(values, settings)).toEqual(expected);
  });
});

describe('formatValue', () => {
  it('formats with Korean grouping, up to two decimals, and the unit', () => {
    expect(formatValue(96, '%')).toBe('96%');
    expect(formatValue(1234.567, '원')).toBe('1,234.57원');
    expect(formatValue(-12.5, '')).toBe('-12.5');
  });

  it('never shows negative zero', () => {
    expect(formatValue(-0, '%')).toBe('0%');
    expect(formatValue(-0.001, '')).toBe('0');
  });
});
