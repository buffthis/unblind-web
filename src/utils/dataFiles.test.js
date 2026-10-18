import { describe, expect, it } from 'vitest';

import { dataFileBlock, dataFileMarker, isDataFile } from './dataFiles';

describe('isDataFile', () => {
  it('takes a file named .json or typed as JSON', () => {
    expect(isDataFile(new File(['{}'], 'chart.json'))).toBe(true);
    expect(isDataFile(new File(['{}'], 'CHART.JSON'))).toBe(true);
    expect(
      isDataFile(new File(['{}'], 'chart', { type: 'application/json' }))
    ).toBe(true);
  });

  it('leaves other files out', () => {
    expect(isDataFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe(
      false
    );
    expect(isDataFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(
      false
    );
    expect(isDataFile(new File(['x'], 'jsonfile'))).toBe(false);
  });
});

describe('dataFileMarker', () => {
  it('stays in the text as plain words, not a code block, while the upload runs', () => {
    expect(dataFileMarker(3, new File(['{}'], 'run.json'))).toBe(
      '[데이터 파일 업로드 중: run.json #3]'
    );
  });
});

describe('dataFileBlock', () => {
  it('is a chart block that reads the file at the address', () => {
    expect(dataFileBlock('https://bucket.test/data/a.json')).toBe(
      '```chart\ndata: https://bucket.test/data/a.json\n```'
    );
  });
});
