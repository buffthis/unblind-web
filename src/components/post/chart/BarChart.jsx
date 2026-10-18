import { useInView, useReducedMotion } from 'framer-motion';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import { labelStride } from './chartGeometry';
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
  topOf,
  useElementWidth,
  useYLabelWidth,
  XAxis,
  XLimitGuide,
  XRangeGuide,
  XTick,
  YGrid,
} from './chartParts';
import { computeDomain, formatValue } from './chartScale';
import { valuesFit } from './chartValues';
import useBarScrub from './useBarScrub';

// A group of bars fills this share of its row; the rest is the gap between groups.
const GROUP = 0.6;
const BAR_GAP = 2;
const MAX_BAR = 40;
const RADIUS = 3;
const DOT = 10;
const DIM_ALPHA = 0.35;
const GROW = '0.6s cubic-bezier(0.22, 1, 0.36, 1)';
// The last bar starts growing at most this long after the first.
const STAGGER_TOTAL = 300;
const STAGGER_STEP = 40;

const BarPlot = styled(Plot)`
  cursor: default;
`;

const Band = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.035);
  opacity: 0;
  transition: ${FADE};
  pointer-events: none;

  [data-shown='true'] & {
    opacity: 1;
  }
`;

const Column = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: ${FADE};

  &[data-dim='true'] {
    opacity: ${DIM_ALPHA};
  }
`;

// A bar keeps its rounded end away from zero; its growth starts at zero too.
const Bar = styled.div`
  position: absolute;
  width: var(--bar-width);
  transition: transform ${GROW};

  &[data-sign='up'] {
    border-radius: ${RADIUS}px ${RADIUS}px 0 0;
    transform-origin: bottom;
  }

  &[data-sign='down'] {
    border-radius: 0 0 ${RADIUS}px ${RADIUS}px;
    transform-origin: top;
  }

  [data-grown='false'] & {
    transform: scaleY(0);
  }
`;

// A dot marks its value by position alone, so it pops in where it sits instead of
// growing from zero. The white ring keeps neighbouring series apart where they overlap.
const DotMark = styled.div`
  position: absolute;
  width: ${DOT}px;
  height: ${DOT}px;
  margin: -${DOT / 2}px 0 0 -${DOT / 2}px;
  border-radius: 50%;
  box-shadow: 0 0 0 1.5px #fff;
  transition: transform ${GROW};

  [data-grown='false'] & {
    transform: scale(0);
  }
`;

// A value sits just clear of the end of its mark: above a mark that rises, below one that
// falls. The white halo keeps it readable over guides and neighbouring marks.
const ValueLabel = styled.span`
  position: absolute;
  font-size: 0.75rem;
  line-height: 1;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.ink};
  text-shadow:
    0 0 2px #fff,
    0 0 2px #fff,
    0 0 3px #fff;
  transition: opacity ${GROW};

  &[data-sign='up'] {
    transform: translate(-50%, calc(-100% - var(--value-gap)));
  }

  &[data-sign='down'] {
    transform: translate(-50%, var(--value-gap));
  }

  [data-grown='false'] & {
    opacity: 0;
  }
`;

// Every bar shares one width: the group's share of the row split across the series,
// capped so a chart with few rows does not turn into slabs.
function barWidth(count, seriesCount) {
  const gaps = (seriesCount - 1) * BAR_GAP;
  const share = (100 / count) * GROUP;
  return `min(${MAX_BAR}px, max(1px, calc((${share}% - ${gaps}px) / ${seriesCount})))`;
}

// The distance between neighbouring marks along the axis: the next bar of the group when
// there are several series, otherwise the next row.
function markSpacing(count, seriesCount, width) {
  const pitch = width / count;
  if (seriesCount === 1) return pitch;
  const bar = Math.min(
    MAX_BAR,
    Math.max(1, (pitch * GROUP - (seriesCount - 1) * BAR_GAP) / seriesCount)
  );
  return bar + BAR_GAP;
}

function barLeft(index, k, count, seriesCount) {
  const center = ((index + 0.5) / count) * 100;
  const group = `(${seriesCount} * var(--bar-width) + ${(seriesCount - 1) * BAR_GAP}px)`;
  return `calc(${center}% - ${group} / 2 + ${k} * (var(--bar-width) + ${BAR_GAP}px))`;
}

// Bars grow the first time half the chart is on screen. With `replay` they fold back
// once none of the chart shows and grow again on return; the two thresholds keep a
// chart that hovers around the half mark from flickering. skipDrawIn is read on mount
// only, like LineChart, so a chart remounted after a syntax error is not grown again.
function useGrowIn(rootRef, reduced, skipDrawIn, onDrawn, replay) {
  const half = useInView(rootRef, { once: !replay, amount: 0.5 });
  const any = useInView(rootRef);
  const [shown, setShown] = useState(skipDrawIn);
  useEffect(() => {
    if (half) setShown(true);
    else if (replay && !any) setShown(false);
  }, [half, any, replay]);
  const grown = reduced || shown || half;
  const onDrawnRef = useRef(onDrawn);
  useEffect(() => {
    onDrawnRef.current = onDrawn;
  }, [onDrawn]);
  useEffect(() => {
    if (grown) onDrawnRef.current?.();
  }, [grown]);
  return grown;
}

// Also draws dot charts (type: dot): the same rows, hover and layout, with a dot at
// each value in place of a bar.
export default function BarChart({
  chart,
  skipDrawIn = false,
  onDrawn,
  replay = false,
}) {
  const { title, unit, labels, series } = chart;
  const dot = chart.type === 'dot';
  const count = labels.length;
  const domain = useMemo(
    () =>
      computeDomain(
        series.flatMap((s) => s.values),
        { ...chart, type: dot ? 'dot' : 'bar' }
      ),
    [chart, series, dot]
  );
  const tableId = `chart-table-${useId().replace(/:/g, '')}`;
  const kind = dot ? '점 그래프' : '막대 그래프';
  const name = title ?? kind;

  const rootRef = useRef(null);
  const frameRef = useRef(null);
  const plotRef = useRef(null);
  const innerRef = useRef(null);
  const bandRef = useRef(null);
  const columnRefs = useRef([]);
  const readoutRef = useRef(null);
  const labelRef = useRef(null);
  const valueRefs = useRef([]);

  const reduced = useReducedMotion() === true;
  const grown = useGrowIn(rootRef, reduced, skipDrawIn, onDrawn, replay);
  const scrub = useBarScrub({
    chart,
    reduced,
    refs: {
      root: rootRef,
      inner: innerRef,
      band: bandRef,
      columns: columnRefs,
      readout: readoutRef,
      label: labelRef,
      values: valueRefs,
    },
  });

  const width = useElementWidth(innerRef);
  const stride = labelStride(count, width);
  const tickLabels = domain.ticks.map((tick) => formatValue(tick, unit));
  useYLabelWidth(frameRef, plotRef, tickLabels.join('|'));
  const span = domain.max - domain.min;
  const valueTexts = series.flatMap((s) =>
    s.values.map((value) => formatValue(value, unit))
  );
  const showValues =
    chart.showValues === true &&
    valuesFit(valueTexts, markSpacing(count, series.length, width));
  const step = Math.min(STAGGER_STEP, STAGGER_TOTAL / count);

  return (
    <Figure
      ref={rootRef}
      data-shown="false"
      data-grown={String(grown)}
      aria-label={name}
      $titled={Boolean(title)}
    >
      {title && <Title>{title}</Title>}
      <Frame ref={frameRef}>
        <ChartReadout
          series={series}
          readoutRef={readoutRef}
          valueRefs={valueRefs}
          labelRef={labelRef}
        />
        <BarPlot
          ref={plotRef}
          tabIndex={0}
          role="group"
          aria-label={`${name}. 화살표 키로 항목별 값을 볼 수 있습니다`}
          aria-describedby={tableId}
          {...scrub}
        >
          <YGrid domain={domain} labels={tickLabels} />
          <Inner
            ref={innerRef}
            data-role="plot-inner"
            style={{ '--bar-width': barWidth(count, series.length) }}
          >
            <Band
              ref={bandRef}
              data-role="band"
              style={{ width: `${100 / count}%` }}
            />
            <RangeGuide chart={chart} domain={domain} />
            <XRangeGuide chart={chart} layout="slot" />
            {labels.map((label, i) => (
              <Column
                key={i}
                data-role="column"
                data-dim="false"
                ref={(element) => {
                  columnRefs.current[i] = element;
                }}
              >
                {series.map((s, k) => {
                  const value = s.values[i];
                  const delay = `${Math.round(i * step)}ms`;
                  const markLeft = `calc(${barLeft(i, k, count, series.length)} + var(--bar-width) / 2)`;
                  const valueLabel = showValues && (
                    <ValueLabel
                      data-role="value"
                      data-sign={value < 0 ? 'down' : 'up'}
                      style={{
                        left: markLeft,
                        top: topOf(value, domain),
                        '--value-gap': `${dot ? DOT / 2 + 3 : 3}px`,
                        transitionDelay: delay,
                      }}
                    >
                      {formatValue(value, unit)}
                    </ValueLabel>
                  );
                  if (dot) {
                    return (
                      <React.Fragment key={k}>
                        <DotMark
                          data-role="dot"
                          style={{
                            left: markLeft,
                            top: topOf(value, domain),
                            background: color(PALETTE[k]),
                            transitionDelay: delay,
                          }}
                        />
                        {valueLabel}
                      </React.Fragment>
                    );
                  }
                  return (
                    <React.Fragment key={k}>
                      <Bar
                        data-role="bar"
                        data-sign={value < 0 ? 'down' : 'up'}
                        style={{
                          left: barLeft(i, k, count, series.length),
                          top: topOf(Math.max(value, 0), domain),
                          height: `${(Math.abs(value) / span) * 100}%`,
                          background: color(PALETTE[k]),
                          transitionDelay: delay,
                        }}
                      />
                      {valueLabel}
                    </React.Fragment>
                  );
                })}
              </Column>
            ))}
            <LimitGuide chart={chart} domain={domain} />
            <XLimitGuide chart={chart} layout="slot" />
          </Inner>
        </BarPlot>
        <XAxis aria-hidden="true" data-axis="x">
          {labels.map((label, i) =>
            i % stride === 0 ? (
              <XTick key={i} style={{ left: `${((i + 0.5) / count) * 100}%` }}>
                {label}
              </XTick>
            ) : null
          )}
        </XAxis>
      </Frame>
      <ChartLegend series={series} />
      <ChartTable id={tableId} name={title ?? `${kind} 데이터`} chart={chart} />
    </Figure>
  );
}
