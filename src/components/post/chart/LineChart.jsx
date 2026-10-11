import { useReducedMotion } from 'framer-motion';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
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

// Horizontal insets follow Linear's chart card (measured at 1440px and 390px wide):
// the left one is the right one plus the y-axis label column. Vertically the same
// rule applies with half of Linear's top space: the space under the x-axis labels
// equals the top inset, so the labelled side carries the extra weight. Readout must
// share the horizontal insets because the scrub hook clamps it against the plot.
const INSET = { top: 40, right: 62, bottom: 40, left: 110, readoutTop: 10 };
const INSET_MOBILE = {
  top: 29,
  right: 26,
  bottom: 29,
  left: 66,
  readoutTop: 5,
};

const Frame = styled.div`
  position: relative;
  padding: ${INSET.top}px ${INSET.right}px ${INSET.bottom}px ${INSET.left}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${INSET_MOBILE.top}px ${INSET_MOBILE.right}px
      ${INSET_MOBILE.bottom}px ${INSET_MOBILE.left}px;
  }
`;

const Readout = styled.div`
  position: absolute;
  top: ${INSET.readoutTop}px;
  left: ${INSET.left}px;
  right: ${INSET.right}px;
  height: 20px;
  pointer-events: none;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.secondary};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    top: ${INSET_MOBILE.readoutTop}px;
    left: ${INSET_MOBILE.left}px;
    right: ${INSET_MOBILE.right}px;
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
  border-top: 1px solid #ececec;
`;

// Anchored by the right edge so long labels grow leftward instead of into the plot.
const YTick = styled.span`
  position: absolute;
  right: calc(100% + 8px);
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
  const plotRef = useRef(null);
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
      clipRect: clipRectRef,
      crosshair: crosshairRef,
      readout: readoutRef,
      label: labelRef,
      points: pointRefs,
      values: valueRefs,
    },
  });

  const width = useElementWidth(plotRef);
  const stride = labelStride(count, width);
  const topOf = (value) =>
    `${(1 - (value - domain.min) / (domain.max - domain.min)) * 100}%`;

  return (
    <Figure ref={rootRef} data-shown="false" aria-label={title ?? '선 그래프'}>
      {title && <Title>{title}</Title>}
      <Frame>
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
          {domain.ticks.map((tick) => (
            <React.Fragment key={tick}>
              <Gridline style={{ top: topOf(tick) }} />
              <YTick style={{ top: topOf(tick) }}>
                {formatValue(tick, unit)}
              </YTick>
            </React.Fragment>
          ))}
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
