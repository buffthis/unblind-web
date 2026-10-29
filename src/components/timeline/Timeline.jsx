import React, { useId, useMemo, useState } from 'react';
import {
  FaBolt,
  FaBookmark,
  FaChartBar,
  FaCheckCircle,
  FaCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaFire,
  FaQuestionCircle,
  FaRegCircle,
  FaThumbtack,
} from 'react-icons/fa';
import { FiChevronDown } from 'react-icons/fi';
import { LuChevronsDownUp, LuChevronsUpDown } from 'react-icons/lu';
import styled from 'styled-components';

import {
  formatClock,
  formatGap as defaultFormatGap,
  minutesBetween,
  parseAt,
} from './timelineFormat';

const TIME_WIDTH = 40;
const TILE = 28;
const ROW_GAP = 12;
const GAP_HEIGHT = 48;
const DAY_PADDING = 10;
// The rail is a 1px line down the middle of the tile, drawn only across a gap. It stops
// short of each tile by this much.
const RAIL_INSET = 6;
// A gap shorter than this is not worth a line of its own.
const DEFAULT_GAP_MIN = 60;

// The kind of an event picks the glyph on its tile. Every tile is the same quiet gray by
// default, so the glyph alone says what happened and nothing pulls the eye. An event
// marked `emphasis` takes the tint of its kind instead. The tints are low in saturation
// on purpose, so an emphasized tile stands out from the gray ones without shouting; the
// glyph of each reaches 3:1 against its tile.
//
// `dot` and `ring` are the plain shapes, for an event that needs a marker and nothing
// more; an event with no kind, or one the component does not know, gets the `dot`.
// `problem` (!), `warning` (triangle) and `question` (?) are the shapes for events that
// call for attention, and `fire` keeps the flame for anyone who wants it.
const KINDS = {
  dot: { Icon: FaCircle, size: 8, background: '#E7EAEE', color: '#4E5968' },
  ring: {
    Icon: FaRegCircle,
    size: 12,
    background: '#EEF0F3',
    color: '#5D6877',
  },
  problem: {
    Icon: FaExclamationCircle,
    background: '#F7F1E4',
    color: '#A97D22',
  },
  warning: {
    Icon: FaExclamationTriangle,
    background: '#F8EEE3',
    color: '#B4691F',
  },
  question: {
    Icon: FaQuestionCircle,
    background: '#F0EEF7',
    color: '#7468A8',
  },
  fire: { Icon: FaFire, background: '#F8EBEB', color: '#B25555' },
  change: { Icon: FaBookmark, background: '#F7EFF3', color: '#A8668A' },
  response: { Icon: FaBolt, background: '#F7EDE8', color: '#B0603F' },
  note: { Icon: FaThumbtack, background: '#EAF3F5', color: '#3F8896' },
  impact: { Icon: FaChartBar, background: '#ECF0F8', color: '#4F6FA8' },
  recovery: { Icon: FaCheckCircle, background: '#EAF4EF', color: '#3F8E6C' },
};

export const KIND_NAMES = Object.keys(KINDS);

const hasDetail = (event) =>
  Boolean(event.body) || (event.tags?.length ?? 0) > 0;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
`;

// The headings are divs with a role. A post body styles its own h2, h3 and p by tag, and
// those rules would otherwise reach into the timeline when it sits in a post.
const Heading = styled.div.attrs({ role: 'heading', 'aria-level': 3 })`
  margin: 0;
  font-size: 15px;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.inkStrong};
`;

const ToggleAll = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  margin-left: auto;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.cardBackground};
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
  font: inherit;
  font-size: 13px;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.inkStrong};
  cursor: pointer;
  transition: background-color 0.12s ease-out;

  &:hover {
    background: ${({ theme }) => theme.colors.inkSurface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Every row shares one grid. The time column is left out of it when no event has a
// time, so the tiles then start at the panel edge instead of leaving an empty column.
const Panel = styled.section`
  --cols: ${({ $timeless }) =>
    $timeless
      ? `${TILE}px minmax(0, 1fr)`
      : `${TIME_WIDTH}px ${TILE}px minmax(0, 1fr)`};
  --areas: ${({ $timeless }) =>
    $timeless ? '"tile content"' : '"time tile content"'};
  --col-gap: 16px;
  --indent: ${({ $dayed }) => ($dayed ? DAY_PADDING : 0)}px;
  --rail-left: ${({ $timeless }) =>
    $timeless ? TILE / 2 : TIME_WIDTH + 16 + TILE / 2}px;

  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.cardBackground};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    --cols: ${({ $timeless }) =>
      $timeless ? `${TILE}px minmax(0, 1fr)` : `36px ${TILE}px minmax(0, 1fr)`};
    --col-gap: 12px;
    --rail-left: ${({ $timeless }) =>
      $timeless ? TILE / 2 : 36 + 12 + TILE / 2}px;
  }
`;

const Group = styled.div`
  & + & {
    margin-top: 24px;
  }
`;

// A day is a section break, not a time, so it is drawn as a pill centered between two
// hairline rules. A time is plain gray text in the column beside the tiles.
const DayLabel = styled.div.attrs({ role: 'heading', 'aria-level': 4 })`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 16px;
  font-size: 12px;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 20px;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.inkSoft};

  span {
    padding: 2px ${DAY_PADDING}px;
    border-radius: ${({ theme }) => theme.radius.full};
    background: ${({ theme }) => theme.colors.inkSurface};
  }

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border};
  }
`;

// With day headings the rows sit one pill-padding in from the panel edge, so the times
// and tiles do not run flush against the panel's border under a centered heading.
// The doubled class (&&) outranks the list rules of a post body, which set a left padding
// on every ol and a top margin on every li that follows another.
const List = styled.ol`
  && {
    display: flex;
    flex-direction: column;
    gap: ${ROW_GAP}px;
    margin: 0;
    padding: 0 0 0 var(--indent);
    list-style: none;
  }
`;

const Row = styled.li`
  && {
    display: grid;
    grid-template-columns: var(--cols);
    grid-template-areas: var(--areas);
    column-gap: var(--col-gap);
    align-items: start;
    margin: 0;
  }
`;

const Gap = styled(Row)`
  position: relative;
  align-items: center;
  height: ${GAP_HEIGHT}px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkMuted};

  &::before {
    content: '';
    position: absolute;
    left: var(--rail-left);
    top: -${RAIL_INSET}px;
    bottom: -${RAIL_INSET}px;
    width: 1px;
    background: ${({ theme }) => theme.colors.border};
  }

  span {
    grid-area: content;
    padding-left: 4px;
  }
`;

const Time = styled.time`
  grid-area: time;
  font-size: 13px;
  line-height: ${TILE}px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.inkMuted};
`;

const Tile = styled.span`
  grid-area: tile;
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${TILE}px;
  height: ${TILE}px;
  border-radius: 8px;
  background: ${({ $tint, theme }) =>
    $tint ? $tint.background : theme.colors.inkSurface};
  color: ${({ $tint, theme }) => ($tint ? $tint.color : theme.colors.inkSoft)};
  font-size: 14px;
`;

const Content = styled.div`
  grid-area: content;
  min-width: 0;
  padding-left: 4px;
`;

const titleStyle = `
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  text-align: left;
  font: inherit;
  font-size: 14px;
  line-height: ${TILE}px;
`;

const TitleButton = styled.button`
  ${titleStyle}
  border: 0;
  background: none;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.inkStrong};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
    border-radius: 4px;
  }

  svg {
    flex: none;
    color: ${({ theme }) => theme.colors.inkMuted};
    transition: transform 0.2s ease;
  }

  &[aria-expanded='true'] svg {
    transform: rotate(180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`;

const TitleText = styled.span`
  ${titleStyle}
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.inkStrong};
`;

// The detail stays in the page while closed so aria-controls always points at something.
// It grows from 0fr to 1fr, which animates the height without measuring it, and turns
// invisible once it is shut so its text leaves the tab order and the reading order.
const Collapse = styled.div`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? '1fr' : '0fr')};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  transition:
    grid-template-rows 0.2s ease,
    visibility 0s linear ${({ $open }) => ($open ? '0s' : '0.2s')};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const CollapseInner = styled.div`
  min-height: 0;
  overflow: hidden;
`;

const Body = styled.div`
  padding-top: 6px;
  font-size: 14px;
  line-height: 22px;
  color: ${({ theme }) => theme.colors.inkSub};
`;

const Tags = styled.ul`
  && {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 10px 0 2px;
    list-style: none;
  }
`;

const Tag = styled.li`
  && {
    margin: 0;
    padding: 3px 8px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 6px;
    font-size: 12px;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    line-height: 16px;
    color: ${({ theme }) => theme.colors.ink};
  }
`;

function Event({ event, open, onToggle }) {
  const detailId = useId();
  const tone = KINDS[event.kind] ?? KINDS.dot;
  const expandable = hasDetail(event);
  return (
    <>
      {event.gapText && (
        <Gap>
          <span>{event.gapText}</span>
        </Gap>
      )}
      <Row>
        {event.timeText && (
          <Time dateTime={event.at?.toISOString()}>{event.timeText}</Time>
        )}
        <Tile $tint={event.emphasis ? tone : null} aria-hidden="true">
          <tone.Icon size={tone.size} />
        </Tile>
        <Content>
          {expandable ? (
            <TitleButton
              type="button"
              aria-expanded={open}
              aria-controls={detailId}
              onClick={onToggle}
            >
              {event.title}
              <FiChevronDown size={14} aria-hidden="true" />
            </TitleButton>
          ) : (
            <TitleText>{event.title}</TitleText>
          )}
          {expandable && (
            <Collapse id={detailId} $open={open}>
              <CollapseInner>
                {event.body && <Body>{event.body}</Body>}
                {event.tags?.length > 0 && (
                  <Tags>
                    {event.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Tags>
                )}
              </CollapseInner>
            </Collapse>
          )}
        </Content>
      </Row>
    </>
  );
}

// Works out what each event shows. The gap above an event is its own `gapBefore` text,
// or else the distance from the previous event's `at` when that is long enough, across
// the break between two groups too. `gapBefore: false` suppresses it for one event.
function prepare(groups, { showTime, showGap, gapMin, formatGap }) {
  let previous = null;
  return groups.map((group) => ({
    label: group.label,
    events: group.events.map((event) => {
      const at = parseAt(event.at);
      let gapText = null;
      if (showGap) {
        if (typeof event.gapBefore === 'string' && event.gapBefore) {
          gapText = event.gapBefore;
        } else if (event.gapBefore !== false) {
          const minutes = minutesBetween(previous, at);
          if (minutes != null && minutes >= Math.max(gapMin, 1)) {
            gapText = formatGap(minutes);
          }
        }
      }
      if (at) previous = at;
      const timeText = showTime ? event.time || (at && formatClock(at)) : null;
      return { ...event, at, gapText, timeText: timeText || null };
    }),
  }));
}

// `groups` is a list of { label, events }. An event is { id, title, kind, emphasis, time,
// at, body, tags, gapBefore }. Nothing but id and title is required, and what an event leaves out
// is left out of the picture: no `label` means no day heading, no `time` or `at` means no
// time column, no `at` means no computed gap.
//
// - `kind` picks the glyph on the tile; `emphasis` tints that tile in the kind's quiet
//   color. Without `emphasis` every tile is the same gray.
// - `time` is the text in the time column ("12:15", "점심"). Without it, a valid `at`
//   shows as a clock time.
// - `at` is a Date, epoch milliseconds or ISO string. The distance between two events'
//   `at` is shown as a gap above the later one once it reaches `gapMin` minutes (60 by
//   default; 0 shows every gap).
// - `gapBefore` is the gap text written by hand, or `false` for none.
// - `showDay`, `showTime` and `showGap` hide a whole kind of element even where the data
//   has it. Only an event with a body or tags can be opened.
export default function Timeline({
  groups,
  title,
  defaultOpenIds = [],
  showDay = true,
  showTime = true,
  showGap = true,
  gapMin = DEFAULT_GAP_MIN,
  formatGap = defaultFormatGap,
  ...rest
}) {
  const prepared = useMemo(
    () => prepare(groups, { showTime, showGap, gapMin, formatGap }),
    [groups, showTime, showGap, gapMin, formatGap]
  );
  const timeless = !prepared.some((group) =>
    group.events.some((event) => event.timeText)
  );
  const dayed = showDay && prepared.some((group) => group.label);
  const expandableIds = useMemo(
    () =>
      prepared.flatMap((group) =>
        group.events.filter(hasDetail).map((event) => event.id)
      ),
    [prepared]
  );
  const [openIds, setOpenIds] = useState(() => new Set(defaultOpenIds));
  const allOpen =
    expandableIds.length > 0 && expandableIds.every((id) => openIds.has(id));

  const toggle = (id) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setOpenIds(new Set(allOpen ? [] : expandableIds));

  return (
    <Wrapper {...rest}>
      {(title || expandableIds.length > 0) && (
        <Header>
          {title && <Heading>{title}</Heading>}
          {expandableIds.length > 0 && (
            <ToggleAll type="button" onClick={toggleAll}>
              {allOpen ? (
                <LuChevronsDownUp size={14} aria-hidden="true" />
              ) : (
                <LuChevronsUpDown size={14} aria-hidden="true" />
              )}
              {allOpen ? '모두 접기' : '모두 펼치기'}
            </ToggleAll>
          )}
        </Header>
      )}
      <Panel $timeless={timeless} $dayed={dayed}>
        {prepared.map((group, index) => (
          <Group key={group.label ?? index}>
            {showDay && group.label && (
              <DayLabel>
                <span>{group.label}</span>
              </DayLabel>
            )}
            <List>
              {group.events.map((event) => (
                <Event
                  key={event.id}
                  event={event}
                  open={openIds.has(event.id)}
                  onToggle={() => toggle(event.id)}
                />
              ))}
            </List>
          </Group>
        ))}
      </Panel>
    </Wrapper>
  );
}
