import { describe, expect, it } from 'vitest';

import { estimateReadingMinutes } from './readingTime';

describe('estimateReadingMinutes', () => {
  it('returns 1 for empty or non-string input', () => {
    expect(estimateReadingMinutes('')).toBe(1);
    expect(estimateReadingMinutes(null)).toBe(1);
    expect(estimateReadingMinutes(undefined)).toBe(1);
  });

  it('rounds up by 500 non-whitespace characters per minute', () => {
    expect(estimateReadingMinutes('가'.repeat(500))).toBe(1);
    expect(estimateReadingMinutes('가'.repeat(501))).toBe(2);
  });

  it('ignores whitespace', () => {
    const spaced = '가 '.repeat(500);
    expect(estimateReadingMinutes(spaced)).toBe(1);
  });

  it('excludes fenced code blocks', () => {
    const code = '```js\n' + 'x'.repeat(5000) + '\n```';
    expect(estimateReadingMinutes(`${'가'.repeat(400)}\n\n${code}`)).toBe(1);
  });
});
