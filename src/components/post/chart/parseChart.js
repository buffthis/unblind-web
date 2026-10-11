const SETTING_KEYS = ['title', 'unit', 'min', 'max'];
const SETTING_LINE = /^([A-Za-z]+):[ \t]*(.*)$/;
const NUMBER = /^-?\d+(\.\d+)?$/;
const SEPARATOR = '---';
const MIN_SERIES = 1;
const MAX_SERIES = 6;
const MIN_ROWS = 2;
const MAX_ROWS = 200;
const TOO_LARGE = '값이 너무 큽니다';

class ChartSyntaxError extends Error {
  constructor(line, column, message) {
    super(message);
    this.line = line;
    this.column = column;
  }
}

function fail(line, column, message) {
  throw new ChartSyntaxError(line, column, message);
}

export function formatChartError({ line, column, message }) {
  const where = column ? `${line}번째 줄 ${column}번째 칸` : `${line}번째 줄`;
  return `${where}: ${message}`;
}

// Double quotes are only for labels that contain commas; escaped quotes are not supported.
function splitCells(text, line) {
  const cells = [];
  let i = 0;
  for (;;) {
    while (text[i] === ' ') i += 1;
    if (text[i] === '"') {
      const close = text.indexOf('"', i + 1);
      if (close === -1) fail(line, null, '큰따옴표가 닫히지 않았습니다');
      cells.push(text.slice(i + 1, close));
      i = close + 1;
      while (text[i] === ' ') i += 1;
      if (i < text.length && text[i] !== ',') {
        fail(line, cells.length, '큰따옴표 뒤에는 쉼표가 와야 합니다');
      }
    } else {
      const comma = text.indexOf(',', i);
      const end = comma === -1 ? text.length : comma;
      cells.push(text.slice(i, end).trim());
      i = end;
    }
    if (i >= text.length) return cells;
    i += 1;
  }
}

function rejectBlankLines(lines, offset) {
  lines.forEach((raw, index) => {
    if (raw.trim() === '')
      fail(offset + index + 1, null, '빈 줄은 쓸 수 없습니다');
  });
}

function parseSettings(lines) {
  const settings = {};
  const lineOf = {};
  lines.forEach((raw, index) => {
    const line = index + 1;
    const match = raw.match(SETTING_LINE);
    if (!match) fail(line, null, '"키: 값" 형식이 아닙니다');
    const [, key, rawValue] = match;
    if (!SETTING_KEYS.includes(key)) {
      fail(
        line,
        null,
        `알 수 없는 설정 '${key}'입니다. ${SETTING_KEYS.join(', ')}만 쓸 수 있습니다`
      );
    }
    if (key in settings) fail(line, null, `'${key}' 설정이 이미 있습니다`);
    const value = rawValue.trim();
    if (value === '') fail(line, null, `'${key}' 값이 비어 있습니다`);
    if (key === 'min' || key === 'max') {
      if (!NUMBER.test(value)) fail(line, null, `숫자가 아닙니다: '${value}'`);
      const number = Number(value);
      if (!Number.isFinite(number)) fail(line, null, TOO_LARGE);
      settings[key] = number;
    } else {
      settings[key] = value;
    }
    lineOf[key] = line;
  });
  if (
    settings.min != null &&
    settings.max != null &&
    settings.min >= settings.max
  ) {
    fail(Math.max(lineOf.min, lineOf.max), null, 'max는 min보다 커야 합니다');
  }
  return settings;
}

function parseTable(lines, offset, settings) {
  if (lines.length === 0) fail(offset, null, '--- 아래에 표가 없습니다');
  rejectBlankLines(lines, offset);

  const headerLine = offset + 1;
  const header = splitCells(lines[0], headerLine);
  const seriesCount = header.length - 1;
  if (seriesCount < MIN_SERIES || seriesCount > MAX_SERIES) {
    fail(
      headerLine,
      null,
      `계열은 ${MIN_SERIES}~${MAX_SERIES}개여야 합니다(지금 ${seriesCount}개)`
    );
  }
  header.forEach((cell, index) => {
    if (cell === '') fail(headerLine, index + 1, '이름이 비어 있습니다');
    if (index > 0 && header.indexOf(cell, 1) !== index) {
      fail(headerLine, index + 1, `계열 이름이 중복됩니다: '${cell}'`);
    }
  });

  const body = lines.slice(1);
  if (body.length < MIN_ROWS || body.length > MAX_ROWS) {
    fail(
      headerLine,
      null,
      `데이터 행은 ${MIN_ROWS}~${MAX_ROWS}개여야 합니다(지금 ${body.length}개)`
    );
  }

  const parsedRows = body.map((raw, rowIndex) => {
    const line = headerLine + rowIndex + 1;
    const cells = splitCells(raw, line);
    if (cells.length !== header.length) {
      fail(
        line,
        null,
        `칸이 ${header.length}개여야 하는데 ${cells.length}개입니다`
      );
    }
    if (cells[0] === '') fail(line, 1, '레이블이 비어 있습니다');
    const values = cells.slice(1).map((cell, k) => {
      const column = k + 2;
      if (!NUMBER.test(cell)) fail(line, column, `숫자가 아닙니다: '${cell}'`);
      const value = Number(cell);
      if (!Number.isFinite(value)) fail(line, column, TOO_LARGE);
      if (settings.min != null && value < settings.min) {
        fail(line, column, `값(${cell})이 min(${settings.min})보다 작습니다`);
      }
      if (settings.max != null && value > settings.max) {
        fail(line, column, `값(${cell})이 max(${settings.max})보다 큽니다`);
      }
      return value;
    });
    return { label: cells[0], values };
  });

  return {
    xLabel: header[0],
    labels: parsedRows.map((row) => row.label),
    series: header.slice(1).map((name, k) => ({
      name,
      values: parsedRows.map((row) => row.values[k]),
    })),
  };
}

function parse(rawText) {
  // Accept CRLF and lone CR line endings so the rest of the parser only sees '\n'.
  const text = rawText.replace(/\r\n?/g, '\n');
  if (text.trim() === '') fail(1, null, '차트 데이터가 비어 있습니다');
  const body = text.endsWith('\n') ? text.slice(0, -1) : text;
  const lines = body.split('\n');
  lines.forEach((line, index) => {
    if (line !== SEPARATOR && line.trim() === SEPARATOR) {
      fail(index + 1, null, '--- 앞뒤에 공백을 쓸 수 없습니다');
    }
  });
  const separators = lines.flatMap((line, index) =>
    line === SEPARATOR ? [index] : []
  );
  if (separators.length > 1)
    fail(separators[1] + 1, null, '---는 한 번만 쓸 수 있습니다');
  if (separators[0] === 0) fail(1, null, '설정이 없으면 ---를 쓰지 않습니다');
  if (separators.length === 0) {
    const first = lines[0].match(SETTING_LINE);
    if (first && SETTING_KEYS.includes(first[1]))
      fail(1, null, '설정 다음 줄에 ---가 없습니다');
  }

  let settings = {};
  let table;
  if (separators.length === 0) {
    table = parseTable(lines, 0, settings);
  } else {
    const separator = separators[0];
    const settingLines = lines.slice(0, separator);
    rejectBlankLines(settingLines, 0);
    settings = parseSettings(settingLines);
    table = parseTable(lines.slice(separator + 1), separator + 1, settings);
  }

  return {
    title: settings.title ?? null,
    unit: settings.unit ?? '',
    min: settings.min ?? null,
    max: settings.max ?? null,
    ...table,
  };
}

export function parseChart(text) {
  try {
    return { ok: true, chart: parse(text) };
  } catch (error) {
    if (!(error instanceof ChartSyntaxError)) throw error;
    return {
      ok: false,
      error: { line: error.line, column: error.column, message: error.message },
    };
  }
}
