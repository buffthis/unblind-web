import { describe, expect, it } from 'vitest';

import {
  BLOCK_GAP,
  BLOCK_MARGIN,
  BOX_GAP,
  BOX_MARGIN,
  lineHeightFor,
  TEXT_SPACE,
} from './spacing';

describe('spacing', () => {
  it('gives every font size the same empty space above and below its line', () => {
    for (const fontSize of [14, 15, 22, 40]) {
      expect((lineHeightFor(fontSize) - fontSize) / 2).toBe(TEXT_SPACE);
    }
  });

  it('keeps the body and title line heights it had before', () => {
    expect(lineHeightFor(15)).toBe(24);
    expect(lineHeightFor(22)).toBe(31);
  });

  it('opens a block with the gap and closes it with none', () => {
    expect(BLOCK_MARGIN).toBe(`${BLOCK_GAP}px 0 0`);
  });

  it('gives a block that is not text the empty space text keeps inside its own box', () => {
    expect(BOX_MARGIN).toBe(`${BLOCK_GAP + TEXT_SPACE}px 0 ${TEXT_SPACE}px`);
  });

  it('puts the gap and the empty space of a text box above a block that is not text', () => {
    expect(BOX_GAP).toBe(BLOCK_GAP + TEXT_SPACE);
  });
});
