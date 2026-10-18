import { describe, expect, it } from 'vitest';

import { valuesFit } from './chartValues';

describe('valuesFit', () => {
  it('fits short texts into a wide slot', () => {
    expect(valuesFit(['10명', '20명'], 42)).toBe(true);
  });

  it('does not fit when the widest text is wider than the slot', () => {
    expect(valuesFit(['10명', '1,234,567원'], 42)).toBe(false);
  });

  it('counts a Korean character wider than a digit', () => {
    expect(valuesFit(['1111'], 30)).toBe(true);
    expect(valuesFit(['가나다라'], 30)).toBe(false);
  });
});
