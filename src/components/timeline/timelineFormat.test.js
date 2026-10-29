import { describe, expect, it } from 'vitest';

import {
  formatClock,
  formatGap,
  minutesBetween,
  parseAt,
} from './timelineFormat';

describe('parseAt', () => {
  it('reads a Date, epoch milliseconds and an ISO string', () => {
    const date = new Date(2026, 9, 27, 12, 15);
    expect(parseAt(date)).toEqual(date);
    expect(parseAt(date.getTime())).toEqual(date);
    expect(parseAt(date.toISOString())).toEqual(date);
  });

  it('returns null for a missing or invalid moment', () => {
    expect(parseAt(undefined)).toBeNull();
    expect(parseAt(null)).toBeNull();
    expect(parseAt('')).toBeNull();
    expect(parseAt('not a date')).toBeNull();
  });
});

describe('formatClock', () => {
  it('pads hours and minutes to two digits', () => {
    expect(formatClock(new Date(2026, 9, 27, 9, 5))).toBe('09:05');
    expect(formatClock(new Date(2026, 9, 27, 13, 52))).toBe('13:52');
  });
});

describe('minutesBetween', () => {
  it('counts whole minutes and gives null when a moment is missing', () => {
    const a = new Date(2026, 9, 27, 12, 15);
    const b = new Date(2026, 9, 27, 13, 52);
    expect(minutesBetween(a, b)).toBe(97);
    expect(minutesBetween(null, b)).toBeNull();
    expect(minutesBetween(a, null)).toBeNull();
  });
});

describe('formatGap', () => {
  it('uses minutes under an hour', () => {
    expect(formatGap(1)).toBe('1분 뒤');
    expect(formatGap(45)).toBe('45분 뒤');
  });

  it('uses hours under a day and drops a zero minute part', () => {
    expect(formatGap(60)).toBe('1시간 뒤');
    expect(formatGap(97)).toBe('1시간 37분 뒤');
    expect(formatGap(150)).toBe('2시간 30분 뒤');
  });

  it('uses days from 24 hours on and drops a zero hour part', () => {
    expect(formatGap(1440)).toBe('1일 뒤');
    expect(formatGap(1440 + 180)).toBe('1일 3시간 뒤');
    expect(formatGap(3 * 1440)).toBe('3일 뒤');
  });
});
