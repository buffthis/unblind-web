import React, { useEffect, useLayoutEffect, useState } from 'react';
import styled from 'styled-components';

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
  margin: 32px 0;
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

export function ChartTable({ id, name, chart }) {
  const { xLabel, labels, series, unit } = chart;
  return (
    <HiddenBox>
      <HiddenTable id={id} aria-label={name}>
        <caption>{name}</caption>
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
                <td key={k}>{formatValue(s.values[i], unit)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </HiddenTable>
    </HiddenBox>
  );
}
