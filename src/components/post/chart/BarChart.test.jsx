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
