import { useReducedMotion } from 'framer-motion';
import React, { useId, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import {
  CLIP_FULL,
  CLIP_PAD,
  labelStride,
  strokeWidthFor,
  toPoints,
  VIEW,
} from './chartGeometry';
import {
  ChartLegend,
  ChartReadout,
  ChartTable,
  color,
  FADE,
  Figure,
  Frame,
  Inner,
  LimitGuide,
  PALETTE,
  Plot,
  RangeGuide,
  Title,
  useElementWidth,
  useYLabelWidth,
  XAxis,
  XTick,
  YGrid,
} from './chartParts';
import { computeDomain, formatValue } from './chartScale';
import useChartScrub from './useChartScrub';
import useDrawIn from './useDrawIn';

export const AHEAD_ALPHA = 0.3;

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

// skipDrawIn is read on mount only: it tells a remounted chart that it was already
// drawn, and later changes must not reset the clip of a chart that is on screen.
export default function LineChart({
  chart,
  skipDrawIn = false,
  onDrawn,
  replay = false,
}) {
  const { title, unit, labels, series } = chart;
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
    replay,
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
  const strokeWidth = strokeWidthFor(count);
  // One bucket per pixel of the plot, at most two points each.
  const buckets = Math.max(50, Math.round(width));
  const paths = useMemo(
    () => series.map((s) => toPoints(s.values, domain, buckets)),
    [series, domain, buckets]
  );
  const tickLabels = domain.ticks.map((tick) => formatValue(tick, unit));
  useYLabelWidth(frameRef, plotRef, tickLabels.join('|'));

  return (
    <Figure ref={rootRef} data-shown="false" aria-label={title ?? '선 그래프'}>
      {title && <Title>{title}</Title>}
      <Frame ref={frameRef}>
        <ChartReadout
          series={series}
          readoutRef={readoutRef}
          valueRefs={valueRefs}
          labelRef={labelRef}
        />
        <Plot
          ref={plotRef}
          tabIndex={0}
          role="group"
          aria-label={`${title ?? '선 그래프'}. 화살표 키로 지점별 값을 볼 수 있습니다`}
          aria-describedby={tableId}
          {...scrub}
        >
          <YGrid domain={domain} labels={tickLabels} />
          <Inner ref={innerRef} data-role="plot-inner">
            <RangeGuide chart={chart} domain={domain} />
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
                    points={paths[k]}
                    stroke={color(PALETTE[k], AHEAD_ALPHA)}
                    style={{ strokeWidth }}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              <g data-layer="past" clipPath={`url(#${clipId})`}>
                {series.map((s, k) => (
                  <Line
                    key={k}
                    points={paths[k]}
                    stroke={color(PALETTE[k])}
                    style={{ strokeWidth }}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            </Svg>
            <LimitGuide chart={chart} domain={domain} />
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
      <ChartLegend series={series} />
      <ChartTable
        id={tableId}
        name={title ?? '선 그래프 데이터'}
        chart={chart}
      />
    </Figure>
  );
}
