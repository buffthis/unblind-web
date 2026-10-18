import { BOX_MARGIN } from '@components/post/spacing';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import styled from 'styled-components';

import { noteText, placeNotes } from './chartNotes';
import { formatValue } from './chartScale';

export const PALETTE = [
  [123, 131, 235],
  [217, 119, 6],
  [13, 148, 136],
  [225, 29, 72],
  [2, 132, 199],
  [100, 116, 139],
];
export const FADE = 'opacity 0.12s ease-out';
const FALLBACK_WIDTH = 700;

export const color = (rgb, alpha) =>
  alpha == null
    ? `rgb(${rgb.join(', ')})`
    : `rgba(${rgb.join(', ')}, ${alpha})`;

// Distance from the top of the plot, as a percentage of its height.
export const topOf = (value, domain) =>
  `${(1 - (value - domain.min) / (domain.max - domain.min)) * 100}%`;

export const Figure = styled.figure`
  margin: ${BOX_MARGIN};
`;

export const Title = styled.figcaption`
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

// Each labelled side gets the opposite side's whitespace plus its labels. Vertically,
// the space under the x-axis labels equals the top inset. Horizontally, the left
// inset is the right inset plus the widest y-axis label (measured after render into
// --y-label-width) plus LABEL_GAP, so the whitespace outside the labels always
// matches the right side. Readout shares the horizontal insets because the scrub
// hook clamps it against the plot's width.
const INSET = { top: 40, right: 62, bottom: 40, readoutTop: 10 };
const INSET_MOBILE = { top: 29, right: 26, bottom: 29, readoutTop: 5 };
const LABEL_GAP = 8;

export const Frame = styled.div`
  position: relative;
  /* Experiment: no frame, and the plot spans the article width; y labels hang into the left margin. */
  padding: ${INSET.top}px 0 ${INSET.bottom}px;
  /* Fixed empty space (about 2.5 12px glyphs) before the first and after the last point,
     so an end x label never runs into the y labels whatever the number of points. */
  --plot-inset: 30px;
  /* The empty sides hang out of the article column, so the data itself spans the column. */
  margin: 0 calc(var(--plot-inset) * -1);

  /* Below this the page padding (20px) cannot hold the 30px overhang. */
  @media (max-width: 760px) {
    --plot-inset: 16px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${INSET_MOBILE.top}px 0 ${INSET_MOBILE.bottom}px;
    --plot-inset: 16px;
  }
`;

const Readout = styled.div`
  position: absolute;
  top: ${INSET.readoutTop}px;
  left: var(--plot-inset);
  right: var(--plot-inset);
  height: 20px;
  pointer-events: none;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.secondary};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    top: ${INSET_MOBILE.readoutTop}px;
  }
`;

const ReadoutInner = styled.div`
  position: absolute;
  left: 0;
  display: flex;
  gap: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: ${FADE};

  [data-shown='true'] & {
    opacity: 1;
  }
`;

// The pointer area is the whole plot, but the data lives in this inset layer;
// moving over the empty sides keeps the nearest end point active.
export const Inner = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--plot-inset);
  right: var(--plot-inset);
`;

export const Plot = styled.div`
  position: relative;
  height: 220px;
  cursor: crosshair;
  touch-action: pan-y;
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.accent};
    border-radius: 4px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    height: 180px;
  }
`;

const Gridline = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  /* A 3px box whose middle third is the 1px line: the box starts 1px above the tick. */
  height: 3px;
  margin-top: -1px;
  background: #ececec;
  /* Across the article column the line is 1px; over the stretches hanging outside it
     the line thins to a point while it fades to 60% strength. */
  clip-path: polygon(
    0 50%,
    var(--plot-inset) 33.333%,
    calc(100% - var(--plot-inset)) 33.333%,
    100% 50%,
    calc(100% - var(--plot-inset)) 66.667%,
    var(--plot-inset) 66.667%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.6),
    #000 var(--plot-inset),
    #000 calc(100% - var(--plot-inset)),
    rgba(0, 0, 0, 0.6)
  );
  mask-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.6),
    #000 var(--plot-inset),
    #000 calc(100% - var(--plot-inset)),
    rgba(0, 0, 0, 0.6)
  );
`;

// Anchored by the right edge so long labels grow leftward instead of into the plot.
const YTick = styled.span`
  position: absolute;
  right: calc(100% + ${LABEL_GAP}px);
  white-space: nowrap;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  transform: translateY(-50%);
`;

export const XAxis = styled.div`
  position: relative;
  margin-left: var(--plot-inset);
  margin-right: var(--plot-inset);
  height: 18px;
  margin-top: 10px;
`;

export const XTick = styled.span`
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  white-space: nowrap;
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

const Dot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
  vertical-align: 1px;
`;

// && beats PostArticle's `table` rule, which sets display: block and overflow-x: auto.
// display: table undoes the block display, which can drop table semantics from the
// accessibility tree; the rest keeps the table visually hidden.
// A table cannot shrink below its content, so the 1px box on the table alone still widens the
// page on narrow screens. This wrapper clips it, and overflow inside it never reaches the page.
const HiddenBox = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

const HiddenTable = styled.table`
  && {
    display: table;
    margin: 0;
    white-space: nowrap;
  }
`;

export function useElementWidth(ref) {
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

// Measures the widest y-axis label before paint and again once web fonts settle,
// writing it to a CSS variable so the left inset follows it without a re-render.
export function useYLabelWidth(frameRef, plotRef, ticksKey) {
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const frame = frameRef.current;
      const plot = plotRef.current;
      if (cancelled || !frame || !plot) return;
      const labels = plot.querySelectorAll('[data-role="ytick"]');
      const widest = Math.max(
        0,
        ...Array.from(labels, (label) => label.offsetWidth)
      );
      if (widest > 0) frame.style.setProperty('--y-label-width', `${widest}px`);
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, [frameRef, plotRef, ticksKey]);
}

// Gridlines and their labels, one per tick, placed inside the plot.
export function YGrid({ domain, labels }) {
  return domain.ticks.map((tick, i) => (
    <React.Fragment key={tick}>
      <Gridline style={{ top: topOf(tick, domain) }} />
      <YTick data-role="ytick" style={{ top: topOf(tick, domain) }}>
        {labels[i]}
      </YTick>
    </React.Fragment>
  ));
}

// The scrub hooks write each series' value and the row label into these spans.
export function ChartReadout({ series, readoutRef, valueRefs, labelRef }) {
  return (
    <Readout aria-hidden="true">
      <ReadoutInner ref={readoutRef} data-role="readout">
        {series.map((s, k) => (
          <span key={k}>
            <Dot style={{ background: color(PALETTE[k]) }} />
            <span
              ref={(element) => {
                valueRefs.current[k] = element;
              }}
            />
          </span>
        ))}
        <span ref={labelRef} />
      </ReadoutInner>
    </Readout>
  );
}

export function ChartLegend({ series }) {
  return (
    <LegendRow aria-hidden="true">
      {series.map((s, k) => (
        <span key={k}>
          <Dot style={{ background: color(PALETTE[k]) }} />
          {s.name}
        </span>
      ))}
    </LegendRow>
  );
}

const joinWords = (...words) => words.filter(Boolean).join(' ') || null;

// The text each guide shows, e.g. "한도 256MB" and "권장 구간 200~256MB", and for the
// vertical ones "출시 3월" and "장애 구간 2월~4월". A vertical guide may have no name,
// then it shows just its point, and it may hide the point (name-only), then it shows just
// its name, or nothing when it has none either. The table caption passes `full` to keep
// the point whatever is hidden on screen.
export function guideTexts(
  { limit, band, xlimit, xband, unit },
  { full = false } = {}
) {
  return {
    limit: limit && `${limit.label} ${formatValue(limit.value, unit)}`,
    band:
      band &&
      `${band.label} ${formatValue(band.from, '')}~${formatValue(band.to, unit)}`,
    xlimit:
      xlimit &&
      joinWords(xlimit.label, xlimit.nameOnly && !full ? null : xlimit.at),
    xband:
      xband &&
      joinWords(
        xband.label,
        xband.nameOnly && !full ? null : `${xband.from}~${xband.to}`
      ),
  };
}

// A guide's name sits just above its upper edge, or just below it when that edge
// is too close to the top of the plot to leave room.
const LABEL_FLIP = 12;

const GuideLabel = styled.span`
  position: absolute;
  right: 0;
  bottom: 3px;
  font-size: 0.7rem;
  line-height: 1;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.inkSoft};

  &[data-below='true'] {
    top: 3px;
    bottom: auto;
  }

  /* Along the line: at the right end unless told otherwise. */
  &[data-align='left'] {
    right: auto;
    left: 0;
  }

  &[data-align='center'] {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }
`;

const LimitLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px dashed ${({ theme }) => theme.colors.inkSoft};
  pointer-events: none;
`;

const RangeShade = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(107, 118, 132, 0.09);
  pointer-events: none;
`;

const RangeEdge = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
`;

function labelBelow(value, domain) {
  return parseFloat(topOf(value, domain)) < LABEL_FLIP;
}

// Drawn over the data so bars and lines never hide it.
export function LimitGuide({ chart, domain }) {
  if (!chart.limit) return null;
  return (
    <LimitLine
      data-role="limit"
      aria-hidden="true"
      style={{ top: topOf(chart.limit.value, domain) }}
    >
      <GuideLabel
        data-below={String(labelBelow(chart.limit.value, domain))}
        data-align={chart.limit.align ?? 'right'}
      >
        {guideTexts(chart).limit}
      </GuideLabel>
    </LimitLine>
  );
}

// Drawn under the data, as a backdrop. Its name hangs off the upper edge, outside
// the shade, so a thin range still has room for it.
export function RangeGuide({ chart, domain }) {
  if (!chart.band) return null;
  const { from, to } = chart.band;
  const top = topOf(to, domain);
  return (
    <RangeShade
      data-role="range"
      aria-hidden="true"
      style={{
        top,
        height: `${((to - from) / (domain.max - domain.min)) * 100}%`,
      }}
    >
      <RangeEdge>
        <GuideLabel
          data-below={String(labelBelow(to, domain))}
          data-align={chart.band.align ?? 'right'}
        >
          {guideTexts(chart).band}
        </GuideLabel>
      </RangeEdge>
    </RangeShade>
  );
}

// Where a row sits across the plot, as a percentage of its width. A line chart puts its
// points on the edges (the first row at 0%, the last at 100%). A bar or dot chart gives
// every row a slot of the same width and centres its group in it.
const pointX = (index, count) => (index / (count - 1)) * 100;
const slotX = (index, count) => (index / count) * 100;

// Past this share of the plot a name turns around to sit on the plot side of its guide.
const FLIP_AFTER = 70;

const XGuideLabel = styled.span`
  position: absolute;
  top: 3px;
  left: 5px;
  font-size: 0.7rem;
  line-height: 1;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.inkSoft};

  &[data-flip='true'] {
    left: auto;
    right: 5px;
  }

  /* Up and down the line: at the top unless told otherwise. */
  &[data-align='middle'] {
    top: 50%;
    transform: translateY(-50%);
  }

  &[data-align='bottom'] {
    top: auto;
    bottom: 3px;
  }
`;

const XLimitLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed ${({ theme }) => theme.colors.inkSoft};
  pointer-events: none;
`;

const XRangeShade = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(107, 118, 132, 0.09);
  pointer-events: none;
`;

// layout is 'point' for a line chart and 'slot' for a bar or dot chart. Drawn over the
// data, like the horizontal line.
export function XLimitGuide({ chart, layout }) {
  if (!chart.xlimit) return null;
  const count = chart.labels.length;
  const { index } = chart.xlimit;
  const left =
    layout === 'point' ? pointX(index, count) : slotX(index + 0.5, count);
  return (
    <XLimitLine
      data-role="xlimit"
      data-flip={String(left > FLIP_AFTER)}
      aria-hidden="true"
      style={{ left: `${left}%` }}
    >
      {guideTexts(chart).xlimit && (
        <XGuideLabel
          data-flip={String(left > FLIP_AFTER)}
          data-align={chart.xlimit.align ?? 'top'}
        >
          {guideTexts(chart).xlimit}
        </XGuideLabel>
      )}
    </XLimitLine>
  );
}

// Drawn under the data, as a backdrop. A bar or dot chart covers the whole slots of its
// first and last row, so the groups inside it sit entirely within the shade.
export function XRangeGuide({ chart, layout }) {
  if (!chart.xband) return null;
  const count = chart.labels.length;
  const { fromIndex, toIndex } = chart.xband;
  const [left, right] =
    layout === 'point'
      ? [pointX(fromIndex, count), pointX(toIndex, count)]
      : [slotX(fromIndex, count), slotX(toIndex + 1, count)];
  const flip = (left + right) / 2 > FLIP_AFTER;
  return (
    <XRangeShade
      data-role="xrange"
      aria-hidden="true"
      style={{ left: `${left}%`, width: `${right - left}%` }}
    >
      {guideTexts(chart).xband && (
        <XGuideLabel
          data-flip={String(flip)}
          data-align={chart.xband.align ?? 'top'}
        >
          {guideTexts(chart).xband}
        </XGuideLabel>
      )}
    </XRangeShade>
  );
}

const NoteLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 0.3s ease-out;
`;

const NOTE_RING = 9;
const NOTE_OFFSET = 12;

const NoteRing = styled.span`
  position: absolute;
  box-sizing: border-box;
  width: ${NOTE_RING}px;
  height: ${NOTE_RING}px;
  margin: -${NOTE_RING / 2}px 0 0 -${NOTE_RING / 2}px;
  border: 2px solid;
  border-radius: 50%;
  background: #fff;
`;

// Joins a ring to a label that was moved off its row.
const NoteLeader = styled.span`
  position: absolute;
  width: 0;
  border-left: 1px solid;
  opacity: 0.6;
`;

// The halo keeps the words readable where a line runs behind them.
const NoteLabel = styled.span`
  position: absolute;
  transform: translateY(-50%);
  white-space: nowrap;
  font-size: 0.75rem;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.ink};
  text-shadow:
    0 0 3px #fff,
    0 0 3px #fff,
    0 0 3px #fff;

  &[data-flip='true'] {
    transform: translate(-100%, -50%);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: max-content;
    max-width: 7.5em;
    white-space: normal;
  }
`;

// Notes that stay on the plot whether or not it is hovered. Each marks its point with a
// ring in the series colour and writes its text beside it.
export function ChartNotes({ chart, domain, layerRef, visible }) {
  const notes = chart.notes ?? [];
  if (notes.length === 0) return null;
  const count = chart.labels.length;
  const points = notes.map((note) => ({
    x: (note.index / (count - 1)) * 100,
    y: parseFloat(
      topOf(chart.series[note.seriesIndex].values[note.index], domain)
    ),
  }));
  const placed = placeNotes(points);
  return (
    <NoteLayer
      ref={layerRef}
      data-role="notes"
      aria-hidden="true"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {notes.map((note, i) => {
        const { x, y, labelY, flip } = placed[i];
        const tint = color(PALETTE[note.seriesIndex]);
        return (
          <React.Fragment key={i}>
            {Math.abs(labelY - y) > 0.5 && (
              <NoteLeader
                data-role="note-leader"
                style={{
                  left: `${x}%`,
                  top: `${Math.min(y, labelY)}%`,
                  height: `${Math.abs(labelY - y)}%`,
                  borderColor: tint,
                }}
              />
            )}
            <NoteRing
              data-role="note-ring"
              style={{ left: `${x}%`, top: `${y}%`, borderColor: tint }}
            />
            <NoteLabel
              data-role="note"
              data-flip={String(flip)}
              style={{
                left: `calc(${x}% ${flip ? '-' : '+'} ${NOTE_OFFSET}px)`,
                top: `${labelY}%`,
              }}
            >
              {noteText(note, chart)}
            </NoteLabel>
          </React.Fragment>
        );
      })}
    </NoteLayer>
  );
}

export function ChartTable({ id, name, chart }) {
  const { xLabel, labels, series, unit } = chart;
  const guides = [
    ...Object.values(guideTexts(chart, { full: true })).filter(Boolean),
    ...(chart.notes ?? []).map(
      (note) => `${note.series} ${note.at}: ${noteText(note, chart)}`
    ),
  ];
  return (
    <HiddenBox>
      <HiddenTable id={id} aria-label={name}>
        <caption>
          {guides.length > 0 ? `${name}. ${guides.join(', ')}` : name}
        </caption>
        <thead>
          <tr>
            <th scope="col">{xLabel}</th>
            {series.map((s, k) => (
              <th key={k} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={i}>
              <th scope="row">{label}</th>
              {series.map((s, k) => (
                <td key={k}>
                  {s.values[i] == null ? '-' : formatValue(s.values[i], unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </HiddenTable>
    </HiddenBox>
  );
}
