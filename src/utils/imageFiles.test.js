import { describe, expect, it } from 'vitest';

import {
  altTextFromFile,
  imageMarkdown,
  pickImageFiles,
  uploadMarker,
} from './imageFiles';

const png = new File(['x'], 'screen shot.png', { type: 'image/png' });
const text = new File(['x'], 'notes.txt', { type: 'text/plain' });

describe('pickImageFiles', () => {
  it('keeps image files only', () => {
    expect(pickImageFiles({ files: [png, text] })).toEqual([png]);
  });

  it('tolerates a missing data transfer', () => {
    expect(pickImageFiles(null)).toEqual([]);
  });
});

describe('markers', () => {
  it('describes an image by its file name without extension', () => {
    expect(altTextFromFile(png)).toBe('screen shot');
    expect(
      altTextFromFile(new File(['x'], '.png', { type: 'image/png' }))
    ).toBe('이미지');
  });

  it('makes a unique upload marker', () => {
    expect(uploadMarker(3, png)).toBe('![screen shot 업로드 중 #3]()');
  });

  it('prefers the server alt text for the final markdown', () => {
    expect(
      imageMarkdown({ url: 'https://a/b.png', altText: '설명' }, png)
    ).toBe('![설명](https://a/b.png)');
    expect(imageMarkdown({ url: 'https://a/b.png', altText: '' }, png)).toBe(
      '![screen shot](https://a/b.png)'
    );
  });
});
