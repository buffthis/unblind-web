import { describe, expect, it } from 'vitest';

import { formatTimelineError, parseTimeline } from './parseTimeline';

const ok = (source) => {
  const result = parseTimeline(source);
  expect(result.ok, JSON.stringify(result.error)).toBe(true);
  return result.timeline;
};

const failure = (source) => {
  const result = parseTimeline(source);
  expect(result.ok).toBe(false);
  return formatTimelineError(result.error);
};

describe('parseTimeline', () => {
  it('reads headings, events, a gap line, tags and a description', () => {
    const timeline = ok(
      [
        '# 월요일',
        '밤 | change | 새 지도 적용',
        '# 화요일',
        '점심 | problem! | 같은 보도에서 반복 정지',
        '  안전 정지가 반복됐습니다.',
        '  그때마다 원격 운전이 들어갔습니다.',
        '  [안전 정지 17회] [원격 운전 6회]',
        '12:15 | response | 구간 차단',
        '~ 97분 뒤',
        '13:52 | recovery | 지도 롤백',
      ].join('\n')
    );

    expect(timeline.title).toBeNull();
    expect(timeline.hide).toEqual({ day: false, time: false, gap: false });
    expect(timeline.gapMin).toBeUndefined();
    expect(timeline.groups.map((group) => group.label)).toEqual([
      '월요일',
      '화요일',
    ]);
    const [stops, block, rollback] = timeline.groups[1].events;
    expect(stops).toMatchObject({
      id: 'e2',
      time: '점심',
      kind: 'problem',
      emphasis: true,
      title: '같은 보도에서 반복 정지',
      body: '안전 정지가 반복됐습니다. 그때마다 원격 운전이 들어갔습니다.',
      tags: ['안전 정지 17회', '원격 운전 6회'],
    });
    expect(block).toMatchObject({ time: '12:15', emphasis: false });
    expect(block.gapBefore).toBeUndefined();
    expect(rollback.gapBefore).toBe('97분 뒤');
  });

  it('puts events written before any heading in a group without a label', () => {
    const timeline = ok('| | 하나\n| | 둘');
    expect(timeline.groups).toHaveLength(1);
    expect(timeline.groups[0].label).toBeUndefined();
    expect(timeline.groups[0].events.map((event) => event.title)).toEqual([
      '하나',
      '둘',
    ]);
  });

  it('leaves out what a cell leaves blank, and reads ! alone as an emphasized dot', () => {
    const [event] = ok('| ! | 제목').groups[0].events;
    expect(event.time).toBeUndefined();
    expect(event.kind).toBeUndefined();
    expect(event.emphasis).toBe(true);
  });

  it('keeps a bar in the title', () => {
    const [event] = ok('12:15 | note | a | b').groups[0].events;
    expect(event.title).toBe('a | b');
  });

  it('reads a moment as local time and leaves the time label to the timeline', () => {
    const [event] = ok('2026-10-27 12:15 | note | 차단').groups[0].events;
    expect(event.time).toBeUndefined();
    expect(event.at).toEqual(new Date(2026, 9, 27, 12, 15));
  });

  it('reads ~ - as no gap above the next event', () => {
    const [, second] = ok('| | 하나\n~ -\n| | 둘').groups[0].events;
    expect(second.gapBefore).toBe(false);
  });

  it('reads the settings above ---', () => {
    const timeline = ok(
      'title: 사건 경위\nhide: day, time\ngapmin: 0\n---\n| | 하나'
    );
    expect(timeline.title).toBe('사건 경위');
    expect(timeline.hide).toEqual({ day: true, time: true, gap: false });
    expect(timeline.gapMin).toBe(0);
  });

  it('accepts CRLF line endings and a trailing newline', () => {
    const timeline = ok('# 월요일\r\n밤 | note | 하나\r\n');
    expect(timeline.groups[0].events).toHaveLength(1);
  });

  describe('errors', () => {
    it('rejects an empty block and a block without events', () => {
      expect(failure('')).toBe('1번째 줄: 타임라인이 비어 있습니다');
      expect(failure('# 월요일')).toBe('1번째 줄: 이벤트가 없습니다');
    });

    it('names the line of an event that is not "time | kind | title"', () => {
      expect(failure('# 월요일\n12:15 response 구간 차단')).toBe(
        '2번째 줄: 이벤트 줄은 "시각 | 종류 | 제목" 형식이어야 합니다(예: 12:15 | response | 구간 차단)'
      );
    });

    it('rejects an unknown kind and lists the known ones', () => {
      expect(failure('| flame | 제목')).toMatch(
        /^1번째 줄: 알 수 없는 종류 'flame'입니다\. dot, ring, .* 중 하나여야 합니다$/
      );
    });

    it('rejects an empty or too long title, and a too long time label', () => {
      expect(failure('12:15 | note |')).toBe('1번째 줄: 제목이 비어 있습니다');
      expect(failure(`| | ${'가'.repeat(81)}`)).toBe(
        '1번째 줄: 제목은 80자까지 쓸 수 있습니다'
      );
      expect(failure('오후 3시 반 | | 제목')).toBe(
        "1번째 줄: 시각은 5자까지 쓸 수 있습니다(지금 '오후 3시 반')"
      );
    });

    it('rejects a moment that is not a real date', () => {
      expect(failure('2026-02-30 12:15 | | 제목')).toBe(
        "1번째 줄: '2026-02-30 12:15'는 없는 날짜나 시각입니다"
      );
    });

    it('rejects an indented line that has no event above it', () => {
      expect(failure('# 월요일\n  설명')).toBe(
        '2번째 줄: 들여쓴 줄은 이벤트 줄 바로 아래에만 쓸 수 있습니다'
      );
      expect(failure('| | 하나\n~ 한참 뒤\n  설명\n| | 둘')).toBe(
        '3번째 줄: 들여쓴 줄은 이벤트 줄 바로 아래에만 쓸 수 있습니다'
      );
    });

    it('rejects a one-space indent and a tab', () => {
      expect(failure('| | 하나\n 설명')).toBe(
        '2번째 줄: 이벤트 설명은 공백 2칸 이상 들여써야 합니다'
      );
      expect(failure('| | 하나\n\t설명')).toBe(
        '2번째 줄: 들여쓰기에는 탭 대신 공백을 써 주세요'
      );
    });

    it('rejects a malformed heading and a malformed gap line', () => {
      expect(failure('#월요일\n| | 하나')).toBe(
        '1번째 줄: # 다음에 공백과 날짜 제목을 쓰세요(예: # 월요일)'
      );
      expect(failure('| | 하나\n~\n| | 둘')).toBe(
        '2번째 줄: ~ 다음에 공백과 간격 문구를 쓰세요(예: ~ 97분 뒤, 없애려면 ~ -)'
      );
    });

    it('rejects a gap line with no event after it, and two in a row', () => {
      expect(failure('| | 하나\n~ 한참 뒤')).toBe(
        '2번째 줄: ~ 줄 다음에는 이벤트 줄이 와야 합니다'
      );
      expect(failure('| | 하나\n~ 한참 뒤\n# 화요일\n| | 둘')).toBe(
        '2번째 줄: ~ 줄 다음에는 이벤트 줄이 와야 합니다'
      );
      expect(failure('| | 하나\n~ 한참 뒤\n~ 더 뒤\n| | 둘')).toBe(
        '3번째 줄: ~ 줄이 연달아 있습니다'
      );
    });

    it('rejects an empty tag and more tags than an event can hold', () => {
      expect(failure('| | 하나\n  []')).toBe('2번째 줄: 태그가 비어 있습니다');
      expect(failure(`| | 하나\n  ${'[a] '.repeat(7)}`)).toBe(
        '2번째 줄: 태그는 이벤트마다 6개까지 쓸 수 있습니다'
      );
    });

    it('rejects a description that is too long', () => {
      expect(failure(`| | 하나\n  ${'가'.repeat(401)}`)).toBe(
        '2번째 줄: 설명은 400자까지 쓸 수 있습니다'
      );
    });

    it('rejects too many events', () => {
      const source = Array.from({ length: 101 }, () => '| | 하나').join('\n');
      expect(failure(source)).toBe(
        '101번째 줄: 이벤트는 100개까지 쓸 수 있습니다'
      );
    });

    it('rejects an unknown, repeated or empty setting', () => {
      expect(failure('units: a\n---\n| | 하나')).toBe(
        "1번째 줄: 알 수 없는 설정 'units'입니다. title, hide, gapmin만 쓸 수 있습니다"
      );
      expect(failure('title: a\ntitle: b\n---\n| | 하나')).toBe(
        "2번째 줄: 'title' 설정이 이미 있습니다"
      );
      expect(failure('title:\n---\n| | 하나')).toBe(
        "1번째 줄: 'title' 값이 비어 있습니다"
      );
    });

    it('rejects a bad hide list and a bad gapmin', () => {
      expect(failure('hide: day, tile\n---\n| | 하나')).toBe(
        "1번째 줄: hide는 day, time, gap를 쉼표로 이어서 쓸 수 있습니다(지금 'tile')"
      );
      expect(failure('hide: day, day\n---\n| | 하나')).toBe(
        "1번째 줄: hide에 'day'가 두 번 있습니다"
      );
      expect(failure('gapmin: 1.5\n---\n| | 하나')).toBe(
        "1번째 줄: gapmin은 분 단위 정수여야 합니다(지금 '1.5')"
      );
    });

    it('requires --- after the settings, once, and not on its own', () => {
      expect(failure('title: a\n| | 하나')).toBe(
        '1번째 줄: 설정 다음 줄에 ---가 없습니다'
      );
      expect(failure('---\n| | 하나')).toBe(
        '1번째 줄: 설정이 없으면 ---를 쓰지 않습니다'
      );
      expect(failure('title: a\n---\n| | 하나\n---')).toBe(
        '4번째 줄: ---는 한 번만 쓸 수 있습니다'
      );
      expect(failure('title: a\n ---\n| | 하나')).toBe(
        '2번째 줄: --- 앞뒤에 공백을 쓸 수 없습니다'
      );
    });

    it('counts a line of the body from the top of the block, settings included', () => {
      expect(failure('title: a\n---\n| | 하나\n오류')).toBe(
        '4번째 줄: 이벤트 줄은 "시각 | 종류 | 제목" 형식이어야 합니다(예: 12:15 | response | 구간 차단)'
      );
    });
  });
});
