import { KIND_NAMES } from '@components/timeline/Timeline';

const SETTING_KEYS = ['title', 'hide', 'gapmin'];
const HIDE_WORDS = ['day', 'time', 'gap'];
const SETTING_LINE = /^([A-Za-z]+):[ \t]*(.*)$/;
const SEPARATOR = '---';
const MAX_TITLE = 60;
const MAX_GAPMIN = 10080;
const MAX_GROUPS = 20;
const MAX_EVENTS = 100;
const MAX_LABEL = 20;
const MAX_GAP_TEXT = 20;
const MAX_EVENT_TITLE = 80;
// The time column is 40px wide, which holds five characters of the 13px text.
const MAX_TIME = 5;
const MAX_BODY = 400;
const MAX_TAGS = 6;
const MAX_TAG = 20;
// "2026-10-27 12:15" (or a T between the date and the clock) is a moment. The timeline
// shows its clock time and works out the gaps between moments.
const MOMENT = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;
const TAGS_LINE = /^(?:\[[^\]]*\][ \t]*)+$/;
const TAG = /\[([^\]]*)\]/g;
const EVENT_FORMAT =
  '이벤트 줄은 "시각 | 종류 | 제목" 형식이어야 합니다(예: 12:15 | response | 구간 차단)';

class TimelineSyntaxError extends Error {
  constructor(line, message) {
    super(message);
    this.line = line;
  }
}

function fail(line, message) {
  throw new TimelineSyntaxError(line, message);
}

export function formatTimelineError({ line, message }) {
  return `${line}번째 줄: ${message}`;
}

function parseSettings(lines) {
  const settings = {
    title: null,
    hide: { day: false, time: false, gap: false },
    gapMin: undefined,
  };
  const seen = new Set();
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (raw.trim() === '') return;
    const match = raw.match(SETTING_LINE);
    if (!match) fail(line, '"키: 값" 형식이 아닙니다');
    const [, key, rawValue] = match;
    if (!SETTING_KEYS.includes(key)) {
      fail(
        line,
        `알 수 없는 설정 '${key}'입니다. ${SETTING_KEYS.join(', ')}만 쓸 수 있습니다`
      );
    }
    if (seen.has(key)) fail(line, `'${key}' 설정이 이미 있습니다`);
    seen.add(key);
    const value = rawValue.trim();
    if (value === '') fail(line, `'${key}' 값이 비어 있습니다`);
    if (key === 'title') {
      if (value.length > MAX_TITLE) {
        fail(line, `title은 ${MAX_TITLE}자까지 쓸 수 있습니다`);
      }
      settings.title = value;
    } else if (key === 'hide') {
      const words = value.split(',').map((word) => word.trim());
      words.forEach((word, position) => {
        if (!HIDE_WORDS.includes(word)) {
          fail(
            line,
            `hide는 ${HIDE_WORDS.join(', ')}를 쉼표로 이어서 쓸 수 있습니다(지금 '${word}')`
          );
        }
        if (words.indexOf(word) !== position) {
          fail(line, `hide에 '${word}'가 두 번 있습니다`);
        }
        settings.hide[word] = true;
      });
    } else {
      if (!/^\d+$/.test(value))
        fail(line, `gapmin은 분 단위 정수여야 합니다(지금 '${value}')`);
      const minutes = Number(value);
      if (minutes > MAX_GAPMIN) {
        fail(line, `gapmin은 ${MAX_GAPMIN}분까지 쓸 수 있습니다`);
      }
      settings.gapMin = minutes;
    }
  });
  return settings;
}

// A moment is read as local time, like the clock time the timeline prints from it.
function parseMoment(text, line) {
  const match = text.match(MOMENT);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  const real =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute;
  if (!real) fail(line, `'${text}'는 없는 날짜나 시각입니다`);
  return date;
}

function parseEventLine(raw, line, id) {
  const first = raw.indexOf('|');
  const second = first === -1 ? -1 : raw.indexOf('|', first + 1);
  if (second === -1) fail(line, EVENT_FORMAT);
  const timeCell = raw.slice(0, first).trim();
  const kindCell = raw.slice(first + 1, second).trim();
  const title = raw.slice(second + 1).trim();

  const emphasis = kindCell.endsWith('!');
  const kind = (emphasis ? kindCell.slice(0, -1) : kindCell).trim();
  if (kind !== '' && !KIND_NAMES.includes(kind)) {
    fail(
      line,
      `알 수 없는 종류 '${kind}'입니다. ${KIND_NAMES.join(', ')} 중 하나여야 합니다`
    );
  }
  if (title === '') fail(line, '제목이 비어 있습니다');
  if (title.length > MAX_EVENT_TITLE) {
    fail(line, `제목은 ${MAX_EVENT_TITLE}자까지 쓸 수 있습니다`);
  }

  const at = parseMoment(timeCell, line);
  if (!at && timeCell.length > MAX_TIME) {
    fail(line, `시각은 ${MAX_TIME}자까지 쓸 수 있습니다(지금 '${timeCell}')`);
  }
  return {
    id,
    title,
    kind: kind || undefined,
    emphasis,
    time: at || timeCell === '' ? undefined : timeCell,
    at: at ?? undefined,
    body: undefined,
    tags: [],
    gapBefore: undefined,
  };
}

function addDetail(event, content, line) {
  if (TAGS_LINE.test(content)) {
    Array.from(content.matchAll(TAG), (match) => match[1].trim()).forEach(
      (tag) => {
        if (tag === '') fail(line, '태그가 비어 있습니다');
        if (tag.length > MAX_TAG) {
          fail(line, `태그는 ${MAX_TAG}자까지 쓸 수 있습니다`);
        }
        event.tags.push(tag);
        if (event.tags.length > MAX_TAGS) {
          fail(line, `태그는 이벤트마다 ${MAX_TAGS}개까지 쓸 수 있습니다`);
        }
      }
    );
    return;
  }
  event.body = event.body ? `${event.body} ${content}` : content;
  if (event.body.length > MAX_BODY) {
    fail(line, `설명은 ${MAX_BODY}자까지 쓸 수 있습니다`);
  }
}

// A line at the left edge is a heading ("# 월요일"), a gap ("~ 97분 뒤") or an event
// ("12:15 | response | 구간 차단"). A line indented two spaces or more belongs to the event
// above it: tags in square brackets, or else a line of its description.
function parseBody(lines, offset) {
  const groups = [];
  let group = null;
  let event = null;
  let gap;
  let gapLine = 0;
  let count = 0;

  const openGroup = (label, line) => {
    if (groups.length >= MAX_GROUPS) {
      fail(line, `날짜 제목은 ${MAX_GROUPS}개까지 쓸 수 있습니다`);
    }
    group = { label, events: [] };
    groups.push(group);
  };
  const noGapPending = () => {
    if (gap !== undefined)
      fail(gapLine, '~ 줄 다음에는 이벤트 줄이 와야 합니다');
  };

  lines.forEach((raw, index) => {
    const line = offset + index + 1;
    if (raw.trim() === '') return;
    const leading = raw.match(/^[ \t]*/)[0];
    if (leading.includes('\t')) {
      fail(line, '들여쓰기에는 탭 대신 공백을 써 주세요');
    }
    if (leading.length === 1) {
      fail(line, '이벤트 설명은 공백 2칸 이상 들여써야 합니다');
    }

    if (leading.length >= 2) {
      if (!event) {
        fail(line, '들여쓴 줄은 이벤트 줄 바로 아래에만 쓸 수 있습니다');
      }
      addDetail(event, raw.trim(), line);
      return;
    }

    if (raw.startsWith('#')) {
      const match = raw.match(/^# +(\S.*)$/);
      if (!match)
        fail(line, '# 다음에 공백과 날짜 제목을 쓰세요(예: # 월요일)');
      noGapPending();
      const label = match[1].trim();
      if (label.length > MAX_LABEL) {
        fail(line, `날짜 제목은 ${MAX_LABEL}자까지 쓸 수 있습니다`);
      }
      openGroup(label, line);
      event = null;
      return;
    }

    if (raw.startsWith('~')) {
      const match = raw.match(/^~ +(\S.*)$/);
      if (!match) {
        fail(
          line,
          '~ 다음에 공백과 간격 문구를 쓰세요(예: ~ 97분 뒤, 없애려면 ~ -)'
        );
      }
      if (gap !== undefined) fail(line, '~ 줄이 연달아 있습니다');
      const text = match[1].trim();
      if (text.length > MAX_GAP_TEXT) {
        fail(line, `간격 문구는 ${MAX_GAP_TEXT}자까지 쓸 수 있습니다`);
      }
      gap = text === '-' ? false : text;
      gapLine = line;
      event = null;
      return;
    }

    count += 1;
    if (count > MAX_EVENTS) {
      fail(line, `이벤트는 ${MAX_EVENTS}개까지 쓸 수 있습니다`);
    }
    event = parseEventLine(raw, line, `e${count}`);
    if (gap !== undefined) {
      event.gapBefore = gap;
      gap = undefined;
    }
    if (!group) openGroup(undefined, line);
    group.events.push(event);
  });

  noGapPending();
  if (count === 0) fail(offset + 1, '이벤트가 없습니다');
  return groups;
}

function parse(rawText) {
  // Accept CRLF and lone CR line endings so the rest of the parser only sees '\n'.
  const text = rawText.replace(/\r\n?/g, '\n');
  if (text.trim() === '') fail(1, '타임라인이 비어 있습니다');
  const lines = (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
  lines.forEach((line, index) => {
    if (line !== SEPARATOR && line.trim() === SEPARATOR) {
      fail(index + 1, '--- 앞뒤에 공백을 쓸 수 없습니다');
    }
  });
  const separators = lines.flatMap((line, index) =>
    line === SEPARATOR ? [index] : []
  );
  if (separators.length > 1) {
    fail(separators[1] + 1, '---는 한 번만 쓸 수 있습니다');
  }
  if (separators[0] === 0) fail(1, '설정이 없으면 ---를 쓰지 않습니다');
  const firstSetting = lines[0].match(SETTING_LINE);
  if (
    separators.length === 0 &&
    firstSetting &&
    SETTING_KEYS.includes(firstSetting[1])
  ) {
    fail(1, '설정 다음 줄에 ---가 없습니다');
  }

  const separator = separators[0] ?? -1;
  const settings = parseSettings(
    separator === -1 ? [] : lines.slice(0, separator)
  );
  const groups = parseBody(lines.slice(separator + 1), separator + 1);
  return { ...settings, groups };
}

// Returns { ok: true, timeline: { title, hide, gapMin, groups } } with the groups in the
// shape the Timeline component takes, or { ok: false, error: { line, message } }.
export function parseTimeline(source) {
  try {
    return { ok: true, timeline: parse(source) };
  } catch (error) {
    if (error instanceof TimelineSyntaxError) {
      return {
        ok: false,
        error: { line: error.line, message: error.message },
      };
    }
    throw error;
  }
}
