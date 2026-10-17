import theme from '@styles/theme/theme';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useInView, useReducedMotion } from 'framer-motion';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BarChart from './BarChart';

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal()),
  useInView: vi.fn(),
  useReducedMotion: vi.fn(),
}));

const chart = {
  title: '팀별 인원',
  unit: '명',
  min: -50,
  max: 50,
  type: 'bar',
  xLabel: '팀',
  labels: ['A', 'B', 'C', 'D'],
  series: [
    { name: 'a', values: [10, 20, -10, 40] },
    { name: 'b', values: [5, 5, 5, 5] },
  ],
};

function renderChart(data = chart, props = {}) {
  const utils = render(
    <ThemeProvider theme={theme}>
      <BarChart chart={data} {...props} />
    </ThemeProvider>
  );
  vi.spyOn(
    utils.container.querySelector('[data-role="plot-inner"]'),
    'getBoundingClientRect'
  ).mockReturnValue({
    left: 0,
    top: 0,
    right: 1000,
    bottom: 220,
    width: 1000,
    height: 220,
    x: 0,
    y: 0,
  });
  const all = (selector) => utils.container.querySelectorAll(selector);
  return {
    ...utils,
    plot: screen.getByRole('group'),
    figure: () => screen.getByRole('figure'),
    bars: () => all('[data-role="bar"]'),
    columns: () => all('[data-role="column"]'),
    band: () => utils.container.querySelector('[data-role="band"]'),
    readout: () => utils.container.querySelector('[data-role="readout"]'),
    rerenderChart: (next) =>
      utils.rerender(
        <ThemeProvider theme={theme}>
          <BarChart chart={next} {...props} />
        </ThemeProvider>
      ),
  };
}

beforeEach(() => {
  useInView.mockReset().mockReturnValue(false);
  useReducedMotion.mockReset().mockReturnValue(true);
});

describe('BarChart', () => {
  it('draws one bar per series in each row', () => {
    const c = renderChart();
    expect(c.columns()).toHaveLength(4);
    expect(c.bars()).toHaveLength(8);
    c.columns().forEach((column) =>
      expect(column.querySelectorAll('[data-role="bar"]')).toHaveLength(2)
    );
  });

  it('grows a positive bar up from zero and a negative bar down from it', () => {
    const c = renderChart();
    const up = c.bars()[2];
    expect(parseFloat(up.style.top)).toBeCloseTo(30);
    expect(parseFloat(up.style.height)).toBeCloseTo(20);
    expect(up).toHaveAttribute('data-sign', 'up');
    const down = c.bars()[4];
    expect(parseFloat(down.style.top)).toBeCloseTo(50);
    expect(parseFloat(down.style.height)).toBeCloseTo(10);
    expect(down).toHaveAttribute('data-sign', 'down');
  });

  it('labels each row under the middle of its group', () => {
    const { container } = renderChart();
    const axis = container.querySelector('[data-axis="x"]');
    expect(within(axis).getByText('A').style.left).toBe('12.5%');
    expect(within(axis).getByText('D').style.left).toBe('87.5%');
  });

  it('exposes the data as a table for screen readers', () => {
    renderChart();
    const table = screen.getByRole('table', { name: '팀별 인원' });
    expect(
      within(table).getByRole('row', { name: 'C -10명 5명' })
    ).toBeInTheDocument();
  });

  it('draws dots placed by value instead of bars for a dot chart', () => {
    const c = renderChart({
      ...chart,
      type: 'dot',
      min: 0,
      max: 50,
      series: [{ name: 'a', values: [10, 20, 30, 40] }],
    });
    expect(c.bars()).toHaveLength(0);
    const dots = c.container.querySelectorAll('[data-role="dot"]');
    expect(dots).toHaveLength(4);
    expect(parseFloat(dots[1].style.top)).toBeCloseTo(60);
    expect(
      screen.getByRole('figure', { name: '팀별 인원' })
    ).toBeInTheDocument();
  });

  it('names an untitled dot chart as one', () => {
    renderChart({ ...chart, type: 'dot', title: null });
    expect(
      screen.getByRole('figure', { name: '점 그래프' })
    ).toBeInTheDocument();
  });

  it('draws a reference line and range with their names and values', () => {
    const c = renderChart({
      ...chart,
      limit: { value: 40, label: '정원' },
      band: { from: 10, to: 20, label: '적정 인원' },
    });
    const limit = c.container.querySelector('[data-role="limit"]');
    expect(parseFloat(limit.style.top)).toBeCloseTo(10);
    expect(limit).toHaveTextContent('정원 40명');
    const band = c.container.querySelector('[data-role="range"]');
    expect(parseFloat(band.style.top)).toBeCloseTo(30);
    expect(parseFloat(band.style.height)).toBeCloseTo(10);
    expect(band).toHaveTextContent('적정 인원 10~20명');
    expect(
      screen.getByRole('table', { name: '팀별 인원' }).querySelector('caption')
    ).toHaveTextContent('정원 40명, 적정 인원 10~20명');
  });

  it('draws a vertical line through the middle of its group and a range over whole groups', () => {
    const c = renderChart({
      ...chart,
      xlimit: { index: 1, at: 'B', label: '개편' },
      xband: { fromIndex: 1, toIndex: 2, from: 'B', to: 'C', label: '신규' },
    });
    const line = c.container.querySelector('[data-role="xlimit"]');
    expect(line.style.left).toBe('37.5%');
    expect(line).toHaveTextContent('개편 B');
    const range = c.container.querySelector('[data-role="xrange"]');
    expect(range.style.left).toBe('25%');
    expect(range.style.width).toBe('50%');
    expect(range).toHaveTextContent('신규 B~C');
    expect(
      screen.getByRole('table', { name: '팀별 인원' }).querySelector('caption')
    ).toHaveTextContent('개편 B, 신규 B~C');
  });

  it('draws the vertical guides of a dot chart the same way', () => {
    const c = renderChart({
      ...chart,
      type: 'dot',
      xlimit: { index: 3, at: 'D', label: '끝' },
    });
    expect(c.container.querySelector('[data-role="xlimit"]').style.left).toBe(
      '87.5%'
    );
  });

  it('falls back to a generic name without a title', () => {
    renderChart({ ...chart, title: null });
    expect(
      screen.getByRole('figure', { name: '막대 그래프' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /^막대 그래프\./ })
    ).toHaveAttribute('tabindex', '0');
  });
});

describe('BarChart draw-in', () => {
  it('waits until the chart is in view, then grows the bars', () => {
    useReducedMotion.mockReturnValue(false);
    const onDrawn = vi.fn();
    const c = renderChart(chart, { onDrawn });
    expect(c.figure()).toHaveAttribute('data-grown', 'false');
    expect(onDrawn).not.toHaveBeenCalled();
    useInView.mockReturnValue(true);
    c.rerenderChart({ ...chart });
    expect(c.figure()).toHaveAttribute('data-grown', 'true');
    expect(onDrawn).toHaveBeenCalled();
  });

  it('starts grown with reduced motion or after an earlier draw', () => {
    expect(renderChart().figure()).toHaveAttribute('data-grown', 'true');
    useReducedMotion.mockReturnValue(false);
    document.body.innerHTML = '';
    expect(renderChart(chart, { skipDrawIn: true }).figure()).toHaveAttribute(
      'data-grown',
      'true'
    );
  });
});

describe('BarChart replay', () => {
  // Half of the chart on screen grows the bars; they fold back only once none of it shows.
  function viewAs({ half, any }) {
    useInView.mockImplementation((_ref, options) =>
      options?.amount === 0.5 ? half : any
    );
  }

  it('folds the bars once off screen and grows them again on return', () => {
    useReducedMotion.mockReturnValue(false);
    viewAs({ half: true, any: true });
    const c = renderChart(chart, { replay: true });
    expect(c.figure()).toHaveAttribute('data-grown', 'true');

    viewAs({ half: false, any: true });
    c.rerenderChart({ ...chart });
    expect(c.figure()).toHaveAttribute('data-grown', 'true');

    viewAs({ half: false, any: false });
    c.rerenderChart({ ...chart });
    expect(c.figure()).toHaveAttribute('data-grown', 'false');

    viewAs({ half: true, any: true });
    c.rerenderChart({ ...chart });
    expect(c.figure()).toHaveAttribute('data-grown', 'true');
  });

  it('watches only the first time half the chart shows when it does not replay', () => {
    useReducedMotion.mockReturnValue(false);
    renderChart(chart);

    // framer-motion latches a `once` observer, so the bars stay grown after it fires.
    expect(useInView).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ once: true, amount: 0.5 })
    );
  });

  it('keeps the bars grown with reduced motion even when replaying', () => {
    viewAs({ half: false, any: false });
    expect(renderChart(chart, { replay: true }).figure()).toHaveAttribute(
      'data-grown',
      'true'
    );
  });
});

describe('BarChart hover with reduced motion', () => {
  it('highlights the row under the pointer and dims the others', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 600 });
    expect(c.figure()).toHaveAttribute('data-shown', 'true');
    expect(c.readout().textContent).toBe('-10명5명C');
    expect(c.band().style.left).toBe('50%');
    const dims = Array.from(c.columns(), (column) => column.dataset.dim);
    expect(dims).toEqual(['true', 'true', 'false', 'true']);
  });

  it('clears the highlight when the pointer leaves', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 100 });
    fireEvent.pointerLeave(c.plot);
    expect(c.figure()).toHaveAttribute('data-shown', 'false');
    const dims = Array.from(c.columns(), (column) => column.dataset.dim);
    expect(dims).toEqual(['false', 'false', 'false', 'false']);
  });

  it('hides when a touch ends, but not on a mouse up', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 100 });
    fireEvent.pointerUp(c.plot, { pointerType: 'mouse' });
    expect(c.figure()).toHaveAttribute('data-shown', 'true');
    fireEvent.pointerUp(c.plot, { pointerType: 'touch' });
    expect(c.figure()).toHaveAttribute('data-shown', 'false');
  });

  it('moves with the keyboard', () => {
    const c = renderChart();
    c.plot.focus();
    fireEvent.keyDown(c.plot, { key: 'Home' });
    expect(c.readout().textContent).toContain('A');
    fireEvent.keyDown(c.plot, { key: 'ArrowRight' });
    expect(c.readout().textContent).toContain('B');
    fireEvent.keyDown(c.plot, { key: 'End' });
    expect(c.readout().textContent).toContain('D');
    fireEvent.keyDown(c.plot, { key: 'ArrowLeft' });
    expect(c.readout().textContent).toContain('C');
    fireEvent.keyDown(c.plot, { key: 'Escape' });
    expect(c.figure()).toHaveAttribute('data-shown', 'false');
  });

  it('rewrites the readout when rows shrink under an active pointer', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 999 });
    expect(c.readout().textContent).toBe('40명5명D');
    c.rerenderChart({
      ...chart,
      labels: chart.labels.slice(0, 3),
      series: chart.series.map((s) => ({ ...s, values: s.values.slice(0, 3) })),
    });
    expect(c.readout().textContent).toBe('-10명5명C');
    const dims = Array.from(c.columns(), (column) => column.dataset.dim);
    expect(dims).toEqual(['true', 'true', 'false']);
  });
});

describe('BarChart hover with motion', () => {
  beforeEach(() => {
    useReducedMotion.mockReturnValue(false);
  });

  it('slides the highlight band to the next row', async () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 100 });
    expect(c.band().style.left).toBe('0%');
    fireEvent.pointerMove(c.plot, { clientX: 600 });
    expect(c.band().style.left).toBe('0%');
    expect(c.readout().textContent).toBe('-10명5명C');
    await waitFor(() => expect(c.band().style.left).toBe('50%'), {
      timeout: 3000,
    });
  });
});
