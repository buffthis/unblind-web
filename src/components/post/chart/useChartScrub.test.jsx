import theme from '@styles/theme/theme';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LineChart from './LineChart';

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal()),
  animate: vi.fn(),
  useInView: vi.fn(),
  useReducedMotion: vi.fn(),
}));

const chart = {
  title: '전환 비율',
  unit: '%',
  min: 0,
  max: 100,
  xLabel: '월',
  labels: ['1월', '2월', '3월', '4월', '5월'],
  series: [
    { name: 'a', values: [10, 20, 30, 40, 50] },
    { name: 'b', values: [50, 40, 30, 20, 10] },
  ],
};

const longer = {
  ...chart,
  labels: [...chart.labels, '6월'],
  series: chart.series.map((s) => ({ ...s, values: [...s.values, 60] })),
};

function renderChart(data = chart) {
  const utils = render(
    <ThemeProvider theme={theme}>
      <LineChart chart={data} />
    </ThemeProvider>
  );
  const plot = screen.getByRole('group');
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 1000,
    bottom: 220,
    width: 1000,
    height: 220,
    x: 0,
    y: 0,
  });
  const q = (selector) => utils.container.querySelector(selector);
  return {
    ...utils,
    plot,
    rerenderChart: (next) =>
      utils.rerender(
        <ThemeProvider theme={theme}>
          <LineChart chart={next} />
        </ThemeProvider>
      ),
    figure: () => screen.getByRole('figure'),
    crosshair: () => q('[data-role="crosshair"]'),
    points: () => utils.container.querySelectorAll('[data-role="point"]'),
    readout: () => q('[data-role="readout"]'),
    clip: () => q('clipPath rect'),
    ahead: () => q('g[data-layer="ahead"]'),
  };
}

beforeEach(() => {
  animate.mockReset().mockImplementation(() => ({ stop: vi.fn() }));
  useInView.mockReset().mockReturnValue(false);
  useReducedMotion.mockReset().mockReturnValue(true);
});

describe('useChartScrub with reduced motion', () => {
  it('shows the nearest point under the pointer', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 500 });
    expect(c.figure()).toHaveAttribute('data-shown', 'true');
    expect(c.crosshair().style.left).toBe('50%');
    expect(c.points()[0].style.top).toBe('70%');
    expect(c.points()[1].style.top).toBe('70%');
    expect(c.readout().textContent).toBe('30%30%3월');
    expect(c.clip()).toHaveAttribute('width', '520');
  });

  it('appears at the right edge even though the spring already rests there', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 1000 });
    expect(c.crosshair().style.left).toBe('100%');
    expect(c.readout().textContent).toBe('50%10%5월');
  });

  it('hides and refills the solid line when the pointer leaves', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 250 });
    fireEvent.pointerLeave(c.plot);
    expect(c.figure()).toHaveAttribute('data-shown', 'false');
    expect(c.clip()).toHaveAttribute('width', '1020');
  });

  it('hides when a touch ends or is cancelled, but not on a mouse up', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 250 });
    fireEvent.pointerUp(c.plot, { pointerType: 'mouse' });
    expect(c.figure()).toHaveAttribute('data-shown', 'true');
    fireEvent.pointerUp(c.plot, { pointerType: 'touch' });
    expect(c.figure()).toHaveAttribute('data-shown', 'false');
    fireEvent.pointerDown(c.plot, { clientX: 250, pointerType: 'touch' });
    fireEvent.pointerCancel(c.plot);
    expect(c.figure()).toHaveAttribute('data-shown', 'false');
  });

  it('moves with the keyboard', () => {
    const c = renderChart();
    c.plot.focus();
    fireEvent.keyDown(c.plot, { key: 'ArrowRight' });
    expect(c.readout().textContent).toContain('5월');
    fireEvent.keyDown(c.plot, { key: 'ArrowLeft' });
    expect(c.readout().textContent).toContain('4월');
    fireEvent.keyDown(c.plot, { key: 'Home' });
    expect(c.readout().textContent).toContain('1월');
    fireEvent.keyDown(c.plot, { key: 'End' });
    expect(c.readout().textContent).toContain('5월');
    fireEvent.keyDown(c.plot, { key: 'Escape' });
    expect(c.figure()).toHaveAttribute('data-shown', 'false');
    fireEvent.keyDown(c.plot, { key: 'ArrowLeft' });
    fireEvent.blur(c.plot);
    expect(c.figure()).toHaveAttribute('data-shown', 'false');
  });

  it('rewrites the readout when rows shrink under an active pointer', () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 1000 });
    expect(c.readout().textContent).toBe('50%10%5월');
    const shorter = {
      ...chart,
      labels: chart.labels.slice(0, 4),
      series: chart.series.map((s) => ({ ...s, values: s.values.slice(0, 4) })),
    };
    c.rerenderChart(shorter);
    expect(c.readout().textContent).toBe('40%20%4월');
    expect(c.crosshair().style.left).toBe('100%');
  });

  it('steps from the new last row when the row count changes while idle', () => {
    const c = renderChart();
    c.rerenderChart(longer);
    c.plot.focus();
    fireEvent.keyDown(c.plot, { key: 'ArrowLeft' });
    expect(c.readout().textContent).toContain('5월');
  });
});

describe('useChartScrub with motion', () => {
  beforeEach(() => {
    useReducedMotion.mockReturnValue(false);
  });

  it('glides to the new point instead of jumping', async () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 0 });
    expect(c.crosshair().style.left).toBe('0%');
    fireEvent.pointerMove(c.plot, { clientX: 500 });
    expect(c.crosshair().style.left).toBe('0%');
    expect(c.readout().textContent).toBe('30%30%3월');
    await waitFor(() => expect(c.crosshair().style.left).toBe('50%'), {
      timeout: 3000,
    });
  });

  it('finishes a running draw-in as soon as the pointer arrives', () => {
    useInView.mockReturnValue(true);
    const c = renderChart();
    expect(animate).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(c.plot, { clientX: 500 });
    expect(animate.mock.results[0].value.stop).toHaveBeenCalled();
    expect(c.ahead().style.opacity).toBe('1');
    expect(c.clip()).toHaveAttribute('width', '520');
  });

  it('refills to the new end when the row count changes right after leaving', async () => {
    const c = renderChart();
    fireEvent.pointerMove(c.plot, { clientX: 0 });
    fireEvent.pointerLeave(c.plot);
    c.rerenderChart(longer);
    await waitFor(() => expect(c.clip()).toHaveAttribute('width', '1020'), {
      timeout: 3000,
    });
  });
});
