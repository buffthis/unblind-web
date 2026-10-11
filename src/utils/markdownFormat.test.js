import { describe, expect, it } from 'vitest';

import { applyFormat } from './markdownFormat';

describe('applyFormat', () => {
  it('wraps the selection in bold and keeps it selected', () => {
    expect(applyFormat('a word b', 2, 6, 'bold')).toEqual({
      text: 'a **word** b',
      selectionStart: 4,
      selectionEnd: 8,
    });
  });

  it('inserts a placeholder when nothing is selected', () => {
    expect(applyFormat('', 0, 0, 'italic')).toEqual({
      text: '_기울인 글씨_',
      selectionStart: 1,
      selectionEnd: 7,
    });
  });

  it('uses inline code for single-line selections', () => {
    expect(applyFormat('x', 0, 1, 'code').text).toBe('`x`');
  });

  it('uses a fenced block for multi-line selections', () => {
    expect(applyFormat('a\nb', 0, 3, 'code').text).toBe('```\na\nb\n```');
  });

  it('selects the url part of a new link', () => {
    const result = applyFormat('see docs', 4, 8, 'link');
    expect(result.text).toBe('see [docs](https://)');
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      'https://'
    );
  });

  it('builds an image with the selection as alt text', () => {
    const result = applyFormat('cat', 0, 3, 'image');
    expect(result.text).toBe('![cat](https://)');
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(
      'https://'
    );
  });
});
