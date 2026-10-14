import { describe, expect, it } from 'vitest';

import { formatTags, normalizeTags, parseTags, tagLimitError } from './tags';

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

describe('tagLimitError', () => {
  const many = (count) => Array.from({ length: count }, (_, i) => `t${i}`);

  it('accepts up to 10 tags of up to 30 characters', () => {
    expect(tagLimitError(many(10).join(', '))).toBeNull();
    expect(tagLimitError('a'.repeat(30))).toBeNull();
    expect(tagLimitError('')).toBeNull();
    expect(tagLimitError(undefined)).toBeNull();
  });

  it('counts tags after dropping # and case-only duplicates, as the server does', () => {
    expect(tagLimitError(`${many(10).join(', ')}, #T0, t1`)).toBeNull();
  });

  it('rejects more than 10 tags', () => {
    expect(tagLimitError(many(11).join(', '))).toBe(
      '태그는 10개까지 쓸 수 있습니다(지금 11개).'
    );
  });

  it('names the first tag longer than 30 characters', () => {
    const long = 'a'.repeat(31);
    expect(tagLimitError(`GPU, ${long}`)).toBe(
      `태그는 30자까지 쓸 수 있습니다: ${long}`
    );
  });

  it('counts an emoji as two characters, like the server', () => {
    expect(tagLimitError('😀'.repeat(15))).toBeNull();
    expect(tagLimitError(`a${'😀'.repeat(15)}`)).not.toBeNull();
  });
});
