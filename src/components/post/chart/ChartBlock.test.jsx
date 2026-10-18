import theme from '@styles/theme/theme';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BarChart from './BarChart';
import ChartBlock, { codeText } from './ChartBlock';
import LineChart from './LineChart';
import { ChartReplayContext } from './replay';
import useChartData from './useChartData';

vi.mock('./LineChart', () => ({ default: vi.fn() }));
vi.mock('./BarChart', () => ({ default: vi.fn() }));
vi.mock('./useChartData', () => ({ default: vi.fn() }));

const VALID = 'title: 전환 비율\n---\n월, a\n1월, 1\n2월, 2\n';

function renderBlock(source) {
  return render(
    <ThemeProvider theme={theme}>
      <ChartBlock source={source}>
        <code className="language-chart">{source}</code>
      </ChartBlock>
    </ThemeProvider>
  );
}

beforeEach(() => {
  useChartData.mockReset().mockReturnValue({ status: 'idle' });
});

afterEach(() => {
  LineChart.mockReset();
  BarChart.mockReset();
});

describe('codeText', () => {
  it('reads the raw text of the code child', () => {
    expect(codeText(<code>{'a\nb'}</code>)).toBe('a\nb');
    expect(codeText(<code>{['a', 'b']}</code>)).toBe('ab');
  });
});

describe('ChartBlock', () => {
  it('renders the chart for valid source', () => {
    LineChart.mockImplementation(({ chart }) => (
      <figure aria-label={chart.title} />
    ));
    renderBlock(VALID);
    expect(
      screen.getByRole('figure', { name: '전환 비율' })
    ).toBeInTheDocument();
  });

  it('hands the replay setting down to the chart, off unless a post turns it on', () => {
    LineChart.mockImplementation(() => <figure />);
    renderBlock(VALID);
    expect(LineChart.mock.calls[0][0].replay).toBe(false);

    LineChart.mockClear();
    render(
      <ThemeProvider theme={theme}>
        <ChartReplayContext.Provider value={true}>
          <ChartBlock source={VALID}>
            <code className="language-chart">{VALID}</code>
          </ChartBlock>
        </ChartReplayContext.Provider>
      </ThemeProvider>
    );
    expect(LineChart.mock.calls[0][0].replay).toBe(true);
  });

  it('renders a bar chart for type: bar', () => {
    BarChart.mockImplementation(({ chart }) => (
      <figure aria-label={chart.title} />
    ));
    renderBlock(`type: bar\n${VALID}`);
    expect(
      screen.getByRole('figure', { name: '전환 비율' })
    ).toBeInTheDocument();
    expect(LineChart).not.toHaveBeenCalled();
  });

  it('falls back to the code block with the first syntax error', () => {
    renderBlock('월, a\n1월, x\n2월, 2');
    expect(
      screen.getByText(
        "차트 문법 오류 · 2번째 줄 2번째 칸: 숫자가 아닙니다: 'x'"
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '복사' })).toBeInTheDocument();
    expect(LineChart).not.toHaveBeenCalled();
  });

  it('shows the code block if drawing throws, and retries when the source changes', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    // React re-throws render errors to window in dev; jsdom would print them as uncaught.
    const swallow = (event) => event.preventDefault();
    window.addEventListener('error', swallow);
    try {
      LineChart.mockImplementation(() => {
        throw new Error('boom');
      });
      const { rerender } = renderBlock(VALID);
      expect(screen.getByRole('button', { name: '복사' })).toBeInTheDocument();
      expect(error).toHaveBeenCalledWith(
        'Failed to render chart:',
        expect.any(Error)
      );

      LineChart.mockImplementation(({ chart }) => (
        <figure aria-label={chart.title} />
      ));
      const next = VALID.replace('2월, 2', '2월, 3');
      rerender(
        <ThemeProvider theme={theme}>
          <ChartBlock source={next}>
            <code className="language-chart">{next}</code>
          </ChartBlock>
        </ThemeProvider>
      );
      expect(
        screen.getByRole('figure', { name: '전환 비율' })
      ).toBeInTheDocument();
    } finally {
      window.removeEventListener('error', swallow);
      error.mockRestore();
    }
  });

  describe('data in a file', () => {
    const URL = 'https://bucket.test/data/a.json';
    const SOURCE = `title: 이동 거리\ndata: ${URL}`;
    const FILE = {
      xLabel: '분',
      labels: ['0', '14', '27'],
      series: [{ name: 'A', values: [0, 840, 1620] }],
    };

    it('reads the address of the file, and nothing for a chart with a table', () => {
      useChartData.mockReturnValue({ status: 'loading' });
      renderBlock(SOURCE);
      expect(useChartData).toHaveBeenLastCalledWith(URL);

      renderBlock(VALID);
      expect(useChartData).toHaveBeenLastCalledWith(undefined);
    });

    it('holds the place of the chart while the file is read, without drawing it', () => {
      useChartData.mockReturnValue({ status: 'loading' });
      renderBlock(SOURCE);
      expect(screen.getByRole('status')).toHaveTextContent(
        '차트 데이터를 불러오는 중'
      );
      expect(LineChart).not.toHaveBeenCalled();
    });

    it('draws the chart the file and the settings make', () => {
      LineChart.mockImplementation(({ chart }) => (
        <figure aria-label={`${chart.title} ${chart.labels.join(',')}`} />
      ));
      useChartData.mockReturnValue({ status: 'ready', data: FILE });
      renderBlock(SOURCE);
      expect(
        screen.getByRole('figure', { name: '이동 거리 0,14,27' })
      ).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('draws a bar chart from a file for type: bar', () => {
      BarChart.mockImplementation(() => <figure aria-label="막대" />);
      useChartData.mockReturnValue({ status: 'ready', data: FILE });
      renderBlock(`type: bar\ndata: ${URL}`);
      expect(screen.getByRole('figure', { name: '막대' })).toBeInTheDocument();
    });

    it('says why the file could not be read, over the code block', () => {
      useChartData.mockReturnValue({ status: 'error', error: 'HTTP 404' });
      renderBlock(SOURCE);
      expect(
        screen.getByText('차트 데이터를 불러오지 못했습니다 · HTTP 404')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '복사' })).toBeInTheDocument();
      expect(LineChart).not.toHaveBeenCalled();
    });

    it('says what is wrong with a file that is not a chart', () => {
      useChartData.mockReturnValue({ status: 'ready', data: { labels: [] } });
      renderBlock(SOURCE);
      expect(
        screen.getByText(
          "차트 문법 오류 · 2번째 줄: 데이터 파일: 'series'는 배열이어야 합니다"
        )
      ).toBeInTheDocument();
      expect(LineChart).not.toHaveBeenCalled();
    });
  });
});
