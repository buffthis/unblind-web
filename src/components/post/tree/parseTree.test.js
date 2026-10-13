import { describe, expect, it } from 'vitest';

import { formatTreeError, parseTree } from './parseTree';

const labels = (node) => ({
  [node.label]: node.children.map(labels),
});

describe('parseTree', () => {
  it('nests deeper lines under the line above and keeps siblings in order', () => {
    const result = parseTree(
      'Splash\n  Create\n  Add\n    Import\n      Phrase\n    Watch\n'
    );
    expect(result.ok).toBe(true);
    expect(labels(result.tree)).toEqual({
      Splash: [
        { Create: [] },
        { Add: [{ Import: [{ Phrase: [] }] }, { Watch: [] }] },
      ],
    });
  });

  it('accepts any indent width as long as siblings agree, and skips blank lines', () => {
    const result = parseTree('\nRoot\n    A\n        A1\n\n    B\n');
    expect(labels(result.tree)).toEqual({
      Root: [{ A: [{ A1: [] }] }, { B: [] }],
    });
  });

  it.each([
    ['  Root', 1, '첫 줄은 들여쓰지 않은 루트여야 합니다'],
    ['Root\n  A\nOther', 3, '루트는 하나만 둘 수 있습니다'],
    ['Root\n    A\n  B', 3, '같은 단계의 줄과 들여쓰기가 맞지 않습니다'],
    ['Root\n\tA', 2, '들여쓰기에는 탭 대신 공백을 써 주세요'],
    ['\n  \n', 1, '항목이 없습니다'],
  ])('rejects %j at line %i', (source, line, message) => {
    expect(parseTree(source)).toEqual({ ok: false, error: { line, message } });
  });

  it('caps the depth', () => {
    const source = Array.from(
      { length: 9 },
      (_, depth) => `${' '.repeat(depth * 2)}n${depth}`
    ).join('\n');
    expect(parseTree(source).error).toEqual({
      line: 9,
      message: '단계는 8개까지 쓸 수 있습니다',
    });
  });

  it('formats an error with its line', () => {
    expect(formatTreeError({ line: 3, message: '틀림' })).toBe(
      '3번째 줄: 틀림'
    );
  });
});
