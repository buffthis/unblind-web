import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildHeadingUrl, copyHeadingLink } from './headingLink';

const location = { origin: 'https://unblind.kr', pathname: '/posts/3' };

afterEach(() => {
  delete navigator.clipboard;
});

describe('buildHeadingUrl', () => {
  it('encodes Korean ids in the fragment', () => {
    expect(buildHeadingUrl('소개-intro', location)).toBe(
      'https://unblind.kr/posts/3#%EC%86%8C%EA%B0%9C-intro'
    );
  });
});

describe('copyHeadingLink', () => {
  it('writes the heading url to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await expect(copyHeadingLink('intro')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}${window.location.pathname}#intro`
    );
  });

  it('returns false when the clipboard is unavailable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(copyHeadingLink('intro')).resolves.toBe(false);
    error.mockRestore();
  });
});
