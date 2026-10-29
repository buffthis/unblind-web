import theme from '@styles/theme/theme';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

import Timeline from './Timeline';

const groups = [
  {
    label: '월요일',
    events: [{ id: 'swap', time: '밤', title: '새 지도 적용', kind: 'change' }],
  },
  {
    label: '화요일',
    events: [
      {
        id: 'stops',
        time: '점심',
        title: '같은 보도에서 반복 정지',
        kind: 'problem',
        body: '세 대가 37분 동안 멈췄습니다.',
        tags: ['안전 정지 17회', '원격 운전 6회'],
      },
      {
        id: 'block',
        time: '12:15',
        title: '구간 차단',
        kind: 'response',
        gapBefore: '97분 뒤',
      },
      {
        id: 'rollback',
        time: '13:52',
        title: '지도 롤백',
        kind: 'recovery',
        body: '피크가 끝난 뒤에 되돌렸습니다.',
      },
    ],
  },
];

const STOPS_BODY = '세 대가 37분 동안 멈췄습니다.';
const ROLLBACK_BODY = '피크가 끝난 뒤에 되돌렸습니다.';

function renderTimeline(props) {
  return render(
    <ThemeProvider theme={theme}>
      <Timeline groups={groups} {...props} />
    </ThemeProvider>
  );
}

describe('Timeline', () => {
  it('lists the days and their events in the order given', () => {
    renderTimeline();
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    ).toEqual(['월요일', '화요일']);
    const times = screen.getAllByText(/^(밤|점심|12:15|13:52)$/);
    expect(times.map((time) => time.textContent)).toEqual([
      '밤',
      '점심',
      '12:15',
      '13:52',
    ]);
  });

  it('shows the text on the rail above an event that has a gap', () => {
    renderTimeline();
    expect(screen.getByText('97분 뒤')).toBeVisible();
  });

  it('shows the title above the panel when one is given', () => {
    renderTimeline({ title: '사건 경위' });
    expect(
      screen.getByRole('heading', { level: 2, name: '사건 경위' })
    ).toBeInTheDocument();
  });

  it('opens only the events with a body or tags', () => {
    renderTimeline();
    expect(
      screen.queryByRole('button', { name: '새 지도 적용' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '구간 차단' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '같은 보도에서 반복 정지' })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('points each toggle at the detail it opens', () => {
    renderTimeline();
    const button = screen.getByRole('button', {
      name: '같은 보도에서 반복 정지',
    });
    const detail = document.getElementById(
      button.getAttribute('aria-controls')
    );
    expect(detail).toContainElement(screen.getByText(STOPS_BODY));
  });

  it('shows the body and tags of an event once it is opened, and hides them again', () => {
    renderTimeline();
    const button = screen.getByRole('button', {
      name: '같은 보도에서 반복 정지',
    });
    expect(screen.getByText(STOPS_BODY)).not.toBeVisible();

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(STOPS_BODY)).toBeVisible();
    const tags = within(screen.getByText('안전 정지 17회').closest('ul'));
    expect(tags.getAllByRole('listitem')).toHaveLength(2);

    fireEvent.click(button);
    expect(screen.getByText(STOPS_BODY)).not.toBeVisible();
  });

  it('opens the events named in defaultOpenIds from the start', () => {
    renderTimeline({ defaultOpenIds: ['rollback'] });
    expect(screen.getByText(ROLLBACK_BODY)).toBeVisible();
    expect(screen.getByText(STOPS_BODY)).not.toBeVisible();
  });

  it('opens and closes every event with the toggle-all button', () => {
    renderTimeline();
    fireEvent.click(screen.getByRole('button', { name: '모두 펼치기' }));
    expect(screen.getByText(STOPS_BODY)).toBeVisible();
    expect(screen.getByText(ROLLBACK_BODY)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '모두 접기' }));
    expect(screen.getByText(STOPS_BODY)).not.toBeVisible();
    expect(screen.getByText(ROLLBACK_BODY)).not.toBeVisible();
  });

  it('leaves out the toggle-all button when nothing can be opened', () => {
    renderTimeline({
      groups: [{ label: '월요일', events: groups[0].events }],
    });
    expect(
      screen.queryByRole('button', { name: '모두 펼치기' })
    ).not.toBeInTheDocument();
  });

  it('draws an event with no kind, or an unknown one, with the same plain shape as the dot', () => {
    const { container } = renderTimeline({
      groups: [
        {
          label: '월요일',
          events: [
            { id: 'dot', time: '09:00', title: '점', kind: 'dot' },
            { id: 'none', time: '09:10', title: '없음' },
            { id: 'unknown', time: '09:20', title: '모름', kind: 'unknown' },
          ],
        },
      ],
    });
    const shapes = Array.from(
      container.querySelectorAll('li span[aria-hidden="true"] svg')
    ).map((svg) => svg.innerHTML);
    expect(shapes).toHaveLength(3);
    expect(new Set(shapes).size).toBe(1);
  });

  it('gives each kind its own shape', () => {
    const { container } = renderTimeline({
      groups: [
        {
          events: KIND_NAMES.map((kind) => ({ id: kind, title: kind, kind })),
        },
      ],
    });
    const shapes = Array.from(
      container.querySelectorAll('li span[aria-hidden="true"] svg')
    ).map((svg) => svg.innerHTML);
    expect(new Set(shapes).size).toBe(KIND_NAMES.length);
  });
});

// Local-time Dates, so the clock text does not depend on the machine's time zone.
const at = (day, hour, minute) => new Date(2026, 9, day, hour, minute);

const stamped = [
  {
    label: '월요일',
    events: [{ id: 'a', title: '지도 교체', at: at(26, 22, 0) }],
  },
  {
    label: '화요일',
    events: [
      { id: 'b', title: '반복 정지', at: at(27, 11, 38) },
      { id: 'c', title: '구간 차단', at: at(27, 12, 15) },
      { id: 'd', title: '지도 롤백', at: at(27, 13, 52) },
    ],
  },
];

describe('Timeline with whatever the data and the switches leave in', () => {
  it('draws no day heading for a group without a label', () => {
    renderTimeline({
      groups: [{ events: [{ id: 'x', time: '09:00', title: '메모' }] }],
    });
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('hides the day headings with showDay={false}', () => {
    renderTimeline({ showDay: false });
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    expect(screen.getByText('새 지도 적용')).toBeInTheDocument();
  });

  it('hides the times with showTime={false}', () => {
    renderTimeline({ showTime: false });
    expect(screen.queryByText('12:15')).not.toBeInTheDocument();
    expect(screen.queryByText('점심')).not.toBeInTheDocument();
  });

  it('leaves the time column out of the grid when no event has a time', () => {
    const { container } = renderTimeline({
      groups: [{ label: '월요일', events: [{ id: 'x', title: '메모' }] }],
    });
    expect(container.querySelector('time')).toBeNull();
    expect(
      getComputedStyle(container.querySelector('section')).getPropertyValue(
        '--areas'
      )
    ).toBe('"tile content"');
  });

  it('keeps the time column when at least one event has a time', () => {
    const { container } = renderTimeline();
    expect(
      getComputedStyle(container.querySelector('section')).getPropertyValue(
        '--areas'
      )
    ).toBe('"time tile content"');
  });

  it('hides gaps with showGap={false}, hand-written ones included', () => {
    renderTimeline({ showGap: false });
    expect(screen.queryByText('97분 뒤')).not.toBeInTheDocument();
  });

  it('turns the distance between two moments into a gap above the later event', () => {
    renderTimeline({ groups: stamped });
    expect(screen.getByText('1시간 37분 뒤')).toBeInTheDocument();
  });

  it('measures a gap across the break between two groups', () => {
    renderTimeline({ groups: stamped });
    expect(screen.getByText('13시간 38분 뒤')).toBeInTheDocument();
  });

  it('leaves out a gap shorter than gapMin, and shows every gap with gapMin={0}', () => {
    renderTimeline({ groups: stamped });
    expect(screen.queryByText('37분 뒤')).not.toBeInTheDocument();
    renderTimeline({ groups: stamped, gapMin: 0 });
    expect(screen.getByText('37분 뒤')).toBeInTheDocument();
  });

  it('lets gapBefore replace the computed gap, and false remove it', () => {
    const groupsWithOverrides = [
      {
        label: '화요일',
        events: [
          { id: 'a', title: '하나', at: at(27, 9, 0) },
          { id: 'b', title: '둘', at: at(27, 12, 0), gapBefore: '한참 뒤' },
          { id: 'c', title: '셋', at: at(27, 15, 0), gapBefore: false },
        ],
      },
    ];
    renderTimeline({ groups: groupsWithOverrides });
    expect(screen.getByText('한참 뒤')).toBeInTheDocument();
    expect(screen.queryByText('3시간 뒤')).not.toBeInTheDocument();
  });

  it('shows the clock time of an event that has only at, and marks it up as a time', () => {
    renderTimeline({ groups: stamped });
    const time = screen.getByText('13:52');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', at(27, 13, 52).toISOString());
  });

  it('prefers the written time over the one worked out from at', () => {
    renderTimeline({
      groups: [
        {
          label: '화요일',
          events: [{ id: 'a', title: '점심', time: '점심', at: at(27, 12, 0) }],
        },
      ],
    });
    expect(screen.getByText('점심', { selector: 'time' })).toBeInTheDocument();
    expect(screen.queryByText('12:00')).not.toBeInTheDocument();
  });

  it('formats a gap with formatGap when one is given', () => {
    renderTimeline({
      groups: stamped,
      formatGap: (minutes) => `+${minutes}m`,
    });
    expect(screen.getByText('+97m')).toBeInTheDocument();
  });

  it('ignores an at that is not a date', () => {
    renderTimeline({
      groups: [
        {
          label: '화요일',
          events: [
            { id: 'a', title: '하나', at: '모름' },
            { id: 'b', title: '둘', at: at(27, 12, 0) },
          ],
        },
      ],
    });
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.queryByText(/뒤$/)).not.toBeInTheDocument();
  });
});

const KIND_NAMES = [
  'dot',
  'ring',
  'problem',
  'warning',
  'question',
  'fire',
  'change',
  'response',
  'note',
  'impact',
  'recovery',
];

const tileStyles = (container) =>
  Array.from(container.querySelectorAll('li span[aria-hidden="true"]')).map(
    (tile) => {
      const { backgroundColor, color } = getComputedStyle(tile);
      return { backgroundColor, color };
    }
  );

describe('Timeline tiles', () => {
  it('gives every kind the same gray tile unless the event is emphasized', () => {
    const { container } = renderTimeline({
      groups: [
        {
          events: KIND_NAMES.map((kind) => ({
            id: kind,
            title: kind,
            kind,
          })),
        },
      ],
    });
    const styles = tileStyles(container);
    expect(styles).toHaveLength(KIND_NAMES.length);
    expect(new Set(styles.map((s) => s.backgroundColor)).size).toBe(1);
    expect(new Set(styles.map((s) => s.color)).size).toBe(1);
  });

  it('tints only the emphasized tile, and differently for each kind', () => {
    const { container } = renderTimeline({
      groups: [
        {
          events: [
            { id: 'plain', title: '기본', kind: 'problem' },
            ...KIND_NAMES.map((kind) => ({
              id: kind,
              title: kind,
              kind,
              emphasis: true,
            })),
          ],
        },
      ],
    });
    const [plain, ...emphasized] = tileStyles(container);
    emphasized.forEach((style) =>
      expect(style.backgroundColor).not.toBe(plain.backgroundColor)
    );
    expect(new Set(emphasized.map((s) => s.backgroundColor)).size).toBe(
      KIND_NAMES.length
    );
  });
});
