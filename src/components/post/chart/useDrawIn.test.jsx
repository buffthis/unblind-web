import theme from '@styles/theme/theme';
import { act, render } from '@testing-library/react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import React, { StrictMode } from 'react';
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
  labels: ['1월', '2월', '3월'],
  series: [{ name: 'a', values: [10, 50, 96] }],
};

function renderChart(wrap = (node) => node) {
  return render(
    wrap(
      <ThemeProvider theme={theme}>
        <LineChart chart={chart} />
      </ThemeProvider>
    )
  );
}

const clipOf = (container) => container.querySelector('clipPath rect');
const aheadOf = (container) => container.querySelector('g[data-layer="ahead"]');

beforeEach(() => {
  animate.mockReset().mockImplementation(() => ({ stop: vi.fn() }));
  useInView.mockReset().mockReturnValue(false);
  useReducedMotion.mockReset().mockReturnValue(false);
});

describe('useDrawIn', () => {
  it('hides the lines until the chart scrolls into view', () => {
    const { container } = renderChart();
    expect(clipOf(container)).toHaveAttribute('width', '0');
    expect(aheadOf(container).style.opacity).toBe('0');
    expect(animate).not.toHaveBeenCalled();
  });

  it('draws the solid lines in once visible, then reveals the faint ones', () => {
    useInView.mockReturnValue(true);
    const { container } = renderChart();
    expect(animate).toHaveBeenCalledWith(
      0,
      1040,
      expect.objectContaining({ duration: 0.8, ease: [0.22, 1, 0.36, 1] })
    );
    const options = animate.mock.calls[0][2];
    act(() => options.onUpdate(520));
    expect(clipOf(container)).toHaveAttribute('width', '520');
    expect(aheadOf(container).style.opacity).toBe('0');
    act(() => options.onComplete());
    expect(clipOf(container)).toHaveAttribute('width', '1040');
    expect(aheadOf(container).style.opacity).toBe('1');
  });

  it('skips the effect when the user prefers reduced motion', () => {
    useReducedMotion.mockReturnValue(true);
    useInView.mockReturnValue(true);
    const { container } = renderChart();
    expect(animate).not.toHaveBeenCalled();
    expect(clipOf(container)).toHaveAttribute('width', '1040');
    expect(aheadOf(container).style.opacity).toBe('1');
  });

  it('restarts after StrictMode tears down the first effect', () => {
    useInView.mockReturnValue(true);
    const { container } = renderChart((node) => (
      <StrictMode>{node}</StrictMode>
    ));
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.results[0].value.stop).toHaveBeenCalled();
    act(() => animate.mock.calls[1][2].onComplete());
    expect(clipOf(container)).toHaveAttribute('width', '1040');
  });
});
