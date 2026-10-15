import { describe, expect, it } from 'vitest';

import { formatChartError, parseChart } from './parseChart';

const rows = (count) =>
  Array.from({ length: count }, (_, i) => `${i + 1}, ${i}`).join('\n');

function errorOf(text) {
  const result = parseChart(text);
  expect(result.ok).toBe(false);
  return result.error;
}

describe('parseChart', () => {
  it('parses settings and a table', () => {
    const text =
      'title: 전환 비율\nunit: %\nmin: 0\nmax: 100\n---\n주, a, b\n3/8, 100, 0\n3/15, 96.5, 4\n';
    expect(parseChart(text)).toEqual({
      ok: true,
      chart: {
        title: '전환 비율',
        unit: '%',
        min: 0,
        max: 100,
        type: 'line',
        limit: null,
        band: null,
        xLabel: '주',
        labels: ['3/8', '3/15'],
        series: [
          { name: 'a', values: [100, 96.5] },
          { name: 'b', values: [0, 4] },
        ],
      },
    });
  });

  it('parses a table without settings', () => {
    const result = parseChart('월, 매출\n1월, -12\n2월, 30');
    expect(result.ok).toBe(true);
    expect(result.chart).toMatchObject({
      title: null,
      unit: '',
      min: null,
      max: null,
      labels: ['1월', '2월'],
    });
    expect(result.chart.series).toEqual([{ name: '매출', values: [-12, 30] }]);
  });

  it('keeps commas inside double-quoted labels', () => {
    const result = parseChart('구간, 값\n"1,000명", 1\n"2,000명", 2');
    expect(result.chart.labels).toEqual(['1,000명', '2,000명']);
  });

  it('accepts CRLF line endings', () => {
    const result = parseChart(
      'title: x\r\nunit: %\r\n---\r\n주, a\r\n1, 1\r\n2, 2\r\n'
    );
    expect(result.ok).toBe(true);
    expect(result.chart).toMatchObject({
      title: 'x',
      unit: '%',
      labels: ['1', '2'],
    });
  });

  it('parses a header without a colon-delimited setting key', () => {
    const plain = parseChart('월, a\n1월, 1\n2월, 2');
    expect(plain.ok).toBe(true);
    const colon = parseChart('시각: 분, a\n1, 1\n2, 2');
    expect(colon.ok).toBe(true);
    expect(colon.chart.xLabel).toBe('시각: 분');
  });

  it('reads type: bar', () => {
    const result = parseChart('type: bar\n---\n팀, 인원\nA, 3');
    expect(result.ok).toBe(true);
    expect(result.chart).toMatchObject({ type: 'bar', labels: ['A'] });
  });

  it('defaults to a line chart', () => {
    expect(parseChart('월, a\n1월, 1\n2월, 2').chart.type).toBe('line');
  });

  it('rejects a line chart of more than 2000 rows', () => {
    expect(errorOf(`주, a\n${rows(2001)}`)).toEqual({
      line: 1,
      column: null,
      message: '데이터 행은 2~2000개여야 합니다(지금 2001개)',
    });
  });

  it('takes up to 2000 rows in a line chart', () => {
    expect(parseChart(`주, a\n${rows(2000)}`).ok).toBe(true);
  });

  it('lets a bar chart take a negative min and up to 40 rows', () => {
    const result = parseChart(`type: bar\nmin: -10\n---\n주, a\n${rows(40)}`);
    expect(result.ok).toBe(true);
  });

  it('reads a reference line with its name', () => {
    const result = parseChart('limit: 256 메모리 한도\n---\n주, a\n1, 1\n2, 2');
    expect(result.chart.limit).toEqual({ value: 256, label: '메모리 한도' });
  });

  it('names a reference line 한도 when no name is given', () => {
    const result = parseChart('limit: -1.5\n---\n주, a\n1, 1\n2, 2');
    expect(result.chart.limit).toEqual({ value: -1.5, label: '한도' });
  });

  it('reads a reference range with its name', () => {
    const result = parseChart(
      'band: -10 ~ -5 정상 범위\n---\n주, a\n1, 1\n2, 2'
    );
    expect(result.chart.band).toEqual({
      from: -10,
      to: -5,
      label: '정상 범위',
    });
  });

  it('names a reference range 기준 구간 when no name is given', () => {
    const result = parseChart('band: 200~256\n---\n주, a\n1, 1\n2, 2');
    expect(result.chart.band).toEqual({
      from: 200,
      to: 256,
      label: '기준 구간',
    });
  });

  it('lets a dot chart start its axis above zero, with up to 40 rows', () => {
    const result = parseChart(
      `type: dot\nmin: 900\n---\n주, a\n${Array.from(
        { length: 40 },
        (_, i) => `${i + 1}, ${950 + i}`
      ).join('\n')}`
    );
    expect(result.ok).toBe(true);
    expect(result.chart).toMatchObject({ type: 'dot', min: 900 });
  });

  it.each([
    [
      'limit: 한도\n---\n주, a\n1, 1\n2, 2',
      1,
      null,
      'limit은 "숫자 이름" 형식이어야 합니다(예: limit: 256 한도)',
    ],
    [
      'band: 200\n---\n주, a\n1, 1\n2, 2',
      1,
      null,
      'band는 "시작~끝 이름" 형식이어야 합니다(예: band: 200~256 권장 구간)',
    ],
    [
      'band: 256~200\n---\n주, a\n1, 1\n2, 2',
      1,
      null,
      'band의 끝값은 시작값보다 커야 합니다',
    ],
    [
      `limit: 1 ${'가'.repeat(21)}\n---\n주, a\n1, 1\n2, 2`,
      1,
      null,
      '이름은 20자까지 쓸 수 있습니다',
    ],
    [
      'max: 100\nlimit: 300\n---\n주, a\n1, 1\n2, 2',
      2,
      null,
      'limit(300)이 max(100)보다 큽니다',
    ],
    [
      'band: -5~5\nmin: 0\n---\n주, a\n1, 1\n2, 2',
      2,
      null,
      'band(-5~5)가 min(0)보다 작은 곳까지 내려갑니다',
    ],
    [
      'type: dot\n---\n주, a\n' +
        Array.from({ length: 41 }, (_, i) => `${i}, 1`).join('\n'),
      3,
      null,
      '데이터 행은 1~40개여야 합니다(지금 41개)',
    ],
  ])(
    'rejects guide setting %j at line %i column %s',
    (text, line, column, message) => {
      expect(errorOf(text)).toEqual({ line, column, message });
    }
  );

  it.each([
    ['', 1, null, '차트 데이터가 비어 있습니다'],
    [
      'type: pie\n---\n주, a\n1, 1\n2, 2',
      1,
      null,
      "type은 line, bar, dot 중 하나여야 합니다(지금 'pie')",
    ],
    [
      'type: bar\nmin: 5\n---\n주, a\n1, 6\n2, 7',
      2,
      null,
      '막대 그래프의 min은 0 이하여야 합니다',
    ],
    [
      'min: 5\ntype: bar\n---\n주, a\n1, 6\n2, 7',
      1,
      null,
      '막대 그래프의 min은 0 이하여야 합니다',
    ],
    [
      'type: bar\nmin: -9\nmax: -1\n---\n주, a\n1, -5\n2, -2',
      3,
      null,
      '막대 그래프의 max는 0 이상이어야 합니다',
    ],
    [
      `type: bar\n---\n주, a\n${rows(41)}`,
      3,
      null,
      '데이터 행은 1~40개여야 합니다(지금 41개)',
    ],
    [
      'units: %\n---\n주, a\n1, 1\n2, 2',
      1,
      null,
      "알 수 없는 설정 'units'입니다. title, unit, min, max, type, limit, band만 쓸 수 있습니다",
    ],
    [
      'Title: x\n---\n주, a\n1, 1\n2, 2',
      1,
      null,
      "알 수 없는 설정 'Title'입니다. title, unit, min, max, type, limit, band만 쓸 수 있습니다",
    ],
    [
      'unit: %\nunit: 원\n---\n주, a\n1, 1\n2, 2',
      2,
      null,
      "'unit' 설정이 이미 있습니다",
    ],
    ['title\n---\n주, a\n1, 1\n2, 2', 1, null, '"키: 값" 형식이 아닙니다'],
    ['title:\n---\n주, a\n1, 1\n2, 2', 1, null, "'title' 값이 비어 있습니다"],
    ['min: a\n---\n주, a\n1, 1\n2, 2', 1, null, "숫자가 아닙니다: 'a'"],
    [
      'min: 10\nmax: 5\n---\n주, a\n6, 6\n7, 7',
      2,
      null,
      'max는 min보다 커야 합니다',
    ],
    ['---\n주, a\n1, 1\n2, 2', 1, null, '설정이 없으면 ---를 쓰지 않습니다'],
    ['unit: %\n---\n주, a\n---\n1, 1', 4, null, '---는 한 번만 쓸 수 있습니다'],
    ['unit: %\n\n---\n주, a\n1, 1\n2, 2', 2, null, '빈 줄은 쓸 수 없습니다'],
    ['주, a\n1, 1\n\n2, 2', 3, null, '빈 줄은 쓸 수 없습니다'],
    ['unit: %\n---', 2, null, '--- 아래에 표가 없습니다'],
    ['주\n1\n2', 1, null, '계열은 1~6개여야 합니다(지금 0개)'],
    [
      '주, a, b, c, d, e, f, g\n1, 1, 1, 1, 1, 1, 1, 1\n2, 2, 2, 2, 2, 2, 2, 2',
      1,
      null,
      '계열은 1~6개여야 합니다(지금 7개)',
    ],
    ['주, a, \n1, 1, 1\n2, 2, 2', 1, 3, '이름이 비어 있습니다'],
    ['주, a, a\n1, 1, 1\n2, 2, 2', 1, 3, "계열 이름이 중복됩니다: 'a'"],
    ['주, a\n1, 1', 1, null, '데이터 행은 2~2000개여야 합니다(지금 1개)'],
    ['주, a, b\n1, 1, 1\n2, 2', 3, null, '칸이 3개여야 하는데 2개입니다'],
    ['주, a\n1, 1\n2, 1,000', 3, null, '칸이 2개여야 하는데 3개입니다'],
    ['주, a\n, 1\n2, 2', 2, 1, '레이블이 비어 있습니다'],
    ['주, a\n1, 96%\n2, 2', 2, 2, "숫자가 아닙니다: '96%'"],
    ['주, a\n1, \n2, 2', 2, 2, "숫자가 아닙니다: ''"],
    ['주\ta\n1\t1\n2\t2', 1, null, '계열은 1~6개여야 합니다(지금 0개)'],
    [
      'max: 100\n---\n주, a\n1, 120\n2, 2',
      4,
      2,
      '값(120)이 max(100)보다 큽니다',
    ],
    ['min: 0\n---\n주, a\n1, -1\n2, 2', 4, 2, '값(-1)이 min(0)보다 작습니다'],
    ['주, a\n"1, 1\n2, 2', 2, null, '큰따옴표가 닫히지 않았습니다'],
    [`주, a\n1, ${'9'.repeat(400)}\n2, 2`, 2, 2, '값이 너무 큽니다'],
    [
      `max: ${'9'.repeat(400)}\n---\n주, a\n1, 1\n2, 2`,
      1,
      null,
      '값이 너무 큽니다',
    ],
    [
      'title: x\n--- \n주, a\n1, 1\n2, 2',
      2,
      null,
      '--- 앞뒤에 공백을 쓸 수 없습니다',
    ],
    ['title: x\n주, a\n1, 1\n2, 2', 1, null, '설정 다음 줄에 ---가 없습니다'],
  ])('rejects %j at line %i column %s', (text, line, column, message) => {
    expect(errorOf(text)).toEqual({ line, column, message });
  });
});

describe('formatChartError', () => {
  it('includes the column when present', () => {
    expect(
      formatChartError({ line: 3, column: 2, message: "숫자가 아닙니다: 'x'" })
    ).toBe("3번째 줄 2번째 칸: 숫자가 아닙니다: 'x'");
    expect(
      formatChartError({
        line: 1,
        column: null,
        message: '빈 줄은 쓸 수 없습니다',
      })
    ).toBe('1번째 줄: 빈 줄은 쓸 수 없습니다');
  });
});
