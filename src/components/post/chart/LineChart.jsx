import { useReducedMotion } from 'framer-motion';
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';

import {
  CLIP_FULL,
  CLIP_PAD,
  labelStride,
  toPoints,
  VIEW,
} from './chartGeometry';
import { computeDomain, formatValue } from './chartScale';
import useChartScrub from './useChartScrub';
import useDrawIn from './useDrawIn';

export const PALETTE = [
  [123, 131, 235],
  [217, 119, 6],
  [13, 148, 136],
  [225, 29, 72],
  [2, 132, 199],
  [100, 116, 139],
];
export const AHEAD_ALPHA = 0.3;
const FALLBACK_WIDTH = 700;
const FADE = 'opacity 0.12s ease-out';

const color = (rgb, alpha) =>
  alpha == null
    ? `rgb(${rgb.join(', ')})`
    : `rgba(${rgb.join(', ')}, ${alpha})`;

const Figure = styled.figure`
  margin: 32px 0;
`;

const Title = styled.figcaption`
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
const DEFAULT_LABEL_WIDTH = 40;
const leftInset = (right) =>
  `calc(var(--y-label-width, ${DEFAULT_LABEL_WIDTH}px) + ${LABEL_GAP + right}px)`;

const Frame = styled.div`
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

// The pointer area is the whole plot, but data, crosshair and points live in this
// inset layer; moving over the empty sides keeps the nearest end point active.
const Inner = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--plot-inset);
  right: var(--plot-inset);
`;

const Plot = styled.div`
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

const Svg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const Line = styled.polyline`
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const Crosshair = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-left: 1px dotted #b5b5b5;
  opacity: 0;
  transition: ${FADE};
  pointer-events: none;

  [data-shown='true'] & {
    opacity: 1;
  }
`;

const Point = styled.span`
  position: absolute;
  left: 0;
  top: 0;
  width: 9px;
  height: 9px;
  margin: -4.5px 0 0 -4.5px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #fff;
  opacity: 0;
  transition: ${FADE};
  pointer-events: none;

  [data-shown='true'] & {
    opacity: 1;
  }
`;

const XAxis = styled.div`
  position: relative;
  margin-left: var(--plot-inset);
  margin-right: var(--plot-inset);
  height: 18px;
  margin-top: 10px;
`;

const XTick = styled.span`
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  white-space: nowrap;
`;

const Legend = styled.div`
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
const HiddenTable = styled.table`
  && {
    display: table;
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`;

function useElementWidth(ref) {
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
function useYLabelWidth(frameRef, plotRef, ticksKey) {
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

// skipDrawIn is read on mount only: it tells a remounted chart that it was already
// drawn, and later changes must not reset the clip of a chart that is on screen.
export default function LineChart({ chart, skipDrawIn = false, onDrawn }) {
  const { title, unit, xLabel, labels, series } = chart;
  const count = labels.length;
  const domain = useMemo(
    () =>
      computeDomain(
        series.flatMap((s) => s.values),
        chart
      ),
    [chart, series]
  );
  const uid = useId().replace(/:/g, '');
  const clipId = `chart-clip-${uid}`;
  const tableId = `chart-table-${uid}`;

  const rootRef = useRef(null);
  const frameRef = useRef(null);
  const plotRef = useRef(null);
  const innerRef = useRef(null);
  const clipRectRef = useRef(null);
  const aheadRef = useRef(null);
  const crosshairRef = useRef(null);
  const readoutRef = useRef(null);
  const labelRef = useRef(null);
  const pointRefs = useRef([]);
  const valueRefs = useRef([]);

  const reduced = useReducedMotion() === true;
  const [startDrawn] = useState(skipDrawIn);
  const drawIn = useDrawIn({
    rootRef,
    clipRectRef,
    aheadRef,
    reduced,
    skip: startDrawn,
    onDrawn,
  });
  const drawnAtStart = reduced || startDrawn;
  const scrub = useChartScrub({
    chart,
    domain,
    reduced,
    drawIn,
    refs: {
      root: rootRef,
      plot: plotRef,
      inner: innerRef,
      clipRect: clipRectRef,
      crosshair: crosshairRef,
      readout: readoutRef,
      label: labelRef,
      points: pointRefs,
      values: valueRefs,
    },
  });

  const width = useElementWidth(innerRef);
  const stride = labelStride(count, width);
  const tickLabels = domain.ticks.map((tick) => formatValue(tick, unit));
  useYLabelWidth(frameRef, plotRef, tickLabels.join('|'));
  const topOf = (value) =>
    `${(1 - (value - domain.min) / (domain.max - domain.min)) * 100}%`;

  return (
    <Figure ref={rootRef} data-shown="false" aria-label={title ?? '선 그래프'}>
      {title && <Title>{title}</Title>}
      <Frame ref={frameRef}>
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
        <Plot
          ref={plotRef}
          tabIndex={0}
          role="group"
          aria-label={`${title ?? '선 그래프'}. 화살표 키로 지점별 값을 볼 수 있습니다`}
          aria-describedby={tableId}
          {...scrub}
        >
          {domain.ticks.map((tick, i) => (
            <React.Fragment key={tick}>
              <Gridline style={{ top: topOf(tick) }} />
              <YTick data-role="ytick" style={{ top: topOf(tick) }}>
                {tickLabels[i]}
              </YTick>
            </React.Fragment>
          ))}
          <Inner ref={innerRef} data-role="plot-inner">
            <Svg
              viewBox={`0 0 ${VIEW} ${VIEW}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                  <rect
                    ref={clipRectRef}
                    x={-CLIP_PAD}
                    y={-50}
                    height={VIEW + 100}
                    width={drawnAtStart ? CLIP_FULL : 0}
                  />
                </clipPath>
              </defs>
              <g
                ref={aheadRef}
                data-layer="ahead"
                style={{ opacity: drawnAtStart ? 1 : 0 }}
              >
                {series.map((s, k) => (
                  <Line
                    key={k}
                    points={toPoints(s.values, domain)}
                    stroke={color(PALETTE[k], AHEAD_ALPHA)}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              <g data-layer="past" clipPath={`url(#${clipId})`}>
                {series.map((s, k) => (
                  <Line
                    key={k}
                    points={toPoints(s.values, domain)}
                    stroke={color(PALETTE[k])}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            </Svg>
            <Crosshair ref={crosshairRef} data-role="crosshair" />
            {series.map((s, k) => (
              <Point
                key={k}
                data-role="point"
                ref={(element) => {
                  pointRefs.current[k] = element;
                }}
                style={{ background: color(PALETTE[k]) }}
              />
            ))}
          </Inner>
        </Plot>
        <XAxis aria-hidden="true" data-axis="x">
          {labels.map((label, i) =>
            i % stride === 0 ? (
              <XTick
                key={i}
                style={{ left: `${count <= 1 ? 0 : (i / (count - 1)) * 100}%` }}
              >
                {label}
              </XTick>
            ) : null
          )}
        </XAxis>
      </Frame>
      <Legend aria-hidden="true">
        {series.map((s, k) => (
          <span key={k}>
            <Dot style={{ background: color(PALETTE[k]) }} />
            {s.name}
          </span>
        ))}
      </Legend>
      <HiddenTable id={tableId} aria-label={title ?? '선 그래프 데이터'}>
        <caption>{title ?? '선 그래프 데이터'}</caption>
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
    </Figure>
  );
}
