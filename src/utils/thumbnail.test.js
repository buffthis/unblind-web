import { describe, expect, it } from 'vitest';

import { joinThumbnail, splitThumbnail } from './thumbnail';

describe('splitThumbnail', () => {
  it('reads a trailing #border as the border switch and removes it from the address', () => {
    expect(splitThumbnail('https://i.imgur.com/a.png#border')).toEqual({
      src: 'https://i.imgur.com/a.png',
      border: true,
    });
  });

  it('leaves an address without it as it is', () => {
    expect(splitThumbnail('https://i.imgur.com/a.png')).toEqual({
      src: 'https://i.imgur.com/a.png',
      border: false,
    });
  });

  it('only reads #border at the very end', () => {
    expect(splitThumbnail('https://a.b/c.png#borders')).toEqual({
      src: 'https://a.b/c.png#borders',
      border: false,
    });
    expect(splitThumbnail('https://a.b/c.png#border=1')).toEqual({
      src: 'https://a.b/c.png#border=1',
      border: false,
    });
  });

  it('copes with a missing address', () => {
    expect(splitThumbnail(undefined)).toEqual({ src: '', border: false });
    expect(splitThumbnail(null)).toEqual({ src: '', border: false });
  });
});

describe('joinThumbnail', () => {
  it('adds #border only when the border is on', () => {
    expect(joinThumbnail('https://a.b/c.png', true)).toBe(
      'https://a.b/c.png#border'
    );
    expect(joinThumbnail('https://a.b/c.png', false)).toBe('https://a.b/c.png');
    expect(joinThumbnail('https://a.b/c.png')).toBe('https://a.b/c.png');
  });

  it('keeps an empty address empty, so no thumbnail is registered', () => {
    expect(joinThumbnail('', true)).toBe('');
  });

  it('round-trips with splitThumbnail', () => {
    const joined = joinThumbnail('https://a.b/c.png#frag', true);
    expect(splitThumbnail(joined)).toEqual({
      src: 'https://a.b/c.png#frag',
      border: true,
    });
  });
});
