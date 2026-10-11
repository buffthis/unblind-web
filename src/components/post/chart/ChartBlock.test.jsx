import theme from '@styles/theme/theme';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ChartBlock, { codeText } from './ChartBlock';
import LineChart from './LineChart';

vi.mock('./LineChart', () => ({ default: vi.fn() }));

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

afterEach(() => {
  LineChart.mockReset();
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
});
