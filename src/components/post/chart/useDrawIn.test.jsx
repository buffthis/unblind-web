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

function renderChart(wrap = (node) => node, props = {}) {
  return render(
    wrap(
      <ThemeProvider theme={theme}>
        <LineChart chart={chart} {...props} />
      </ThemeProvider>
    )
  );
}

// The chart watches two thresholds: half of it on screen starts the draw-in, and any
// part of it on screen keeps a replaying chart drawn.
function viewAs({ half, any }) {
  useInView.mockImplementation((_ref, options) =>
    options?.amount === 0.5 ? half : any
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

  describe('replay', () => {
    const replaying = (node) => node;
    const rerenderWith = (utils, props) =>
      utils.rerender(
        <ThemeProvider theme={theme}>
          <LineChart chart={chart} {...props} />
        </ThemeProvider>
      );

    it('resets once the chart is fully off screen and draws again on return', () => {
      viewAs({ half: true, any: true });
      const utils = renderChart(replaying, { replay: true });
      expect(animate).toHaveBeenCalledTimes(1);
      act(() => animate.mock.calls[0][2].onComplete());
      expect(clipOf(utils.container)).toHaveAttribute('width', '1040');

      viewAs({ half: false, any: false });
      rerenderWith(utils, { replay: true });
      expect(clipOf(utils.container)).toHaveAttribute('width', '0');
      expect(aheadOf(utils.container).style.opacity).toBe('0');

      viewAs({ half: true, any: true });
      rerenderWith(utils, { replay: true });
      expect(animate).toHaveBeenCalledTimes(2);
    });

    it('stays drawn while any part of the chart is still on screen', () => {
      viewAs({ half: true, any: true });
      const utils = renderChart(replaying, { replay: true });
      act(() => animate.mock.calls[0][2].onComplete());

      viewAs({ half: false, any: true });
      rerenderWith(utils, { replay: true });
      expect(clipOf(utils.container)).toHaveAttribute('width', '1040');
      expect(aheadOf(utils.container).style.opacity).toBe('1');
    });

    it('stops a draw-in that is still running when the chart leaves', () => {
      viewAs({ half: true, any: true });
      const utils = renderChart(replaying, { replay: true });
      const running = animate.mock.results[0].value;

      viewAs({ half: false, any: false });
      rerenderWith(utils, { replay: true });
      expect(running.stop).toHaveBeenCalled();
      expect(clipOf(utils.container)).toHaveAttribute('width', '0');
    });

    it('never resets a chart that does not replay', () => {
      viewAs({ half: true, any: true });
      const utils = renderChart(replaying);
      act(() => animate.mock.calls[0][2].onComplete());

      viewAs({ half: false, any: false });
      rerenderWith(utils, {});
      expect(clipOf(utils.container)).toHaveAttribute('width', '1040');
      expect(animate).toHaveBeenCalledTimes(1);
    });

    it('never resets with reduced motion', () => {
      useReducedMotion.mockReturnValue(true);
      viewAs({ half: true, any: true });
      const utils = renderChart(replaying, { replay: true });

      viewAs({ half: false, any: false });
      rerenderWith(utils, { replay: true });
      expect(clipOf(utils.container)).toHaveAttribute('width', '1040');
    });
  });
});
