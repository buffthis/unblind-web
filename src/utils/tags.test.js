import { describe, expect, it } from 'vitest';

import { formatTags, normalizeTags, parseTags } from './tags';

describe('parseTags', () => {
  it('splits on commas and trims', () => {
    expect(parseTags(' GPU,Kubernetes ,  AI Infrastructure ')).toEqual([
      'GPU',
      'Kubernetes',
      'AI Infrastructure',
    ]);
  });

  it('drops empty entries, leading # and case-insensitive duplicates', () => {
    expect(parseTags('#GPU, , gpu, ##React,')).toEqual(['GPU', 'React']);
  });

  it('returns no tags for a blank line', () => {
    expect(parseTags('   ')).toEqual([]);
  });
});

describe('normalizeTags', () => {
  it('keeps only non-empty strings', () => {
    expect(normalizeTags(['GPU', '', ' ', null, 3, 'React'])).toEqual([
      'GPU',
      'React',
    ]);
  });

  it('treats a missing field as no tags', () => {
    expect(normalizeTags(undefined)).toEqual([]);
  });
});

describe('formatTags', () => {
  it('joins tags back into the editor line', () => {
    expect(formatTags(['GPU', 'React'])).toBe('GPU, React');
  });
});
