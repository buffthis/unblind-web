import theme from '@styles/theme/theme';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

import LineChart from './LineChart';

const chart = {
  title: '전환 비율',
  unit: '%',
  min: 0,
  max: 100,
  xLabel: '월',
  labels: ['1월', '2월', '3월'],
  series: [
    { name: 'a', values: [10, 50, 96] },
    { name: 'b', values: [90, 50, 4] },
  ],
};

function renderChart(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <LineChart chart={{ ...chart, ...props }} />
    </ThemeProvider>
  );
}

describe('LineChart', () => {
  it('names the figure with its title', () => {
    renderChart();
    expect(screen.getByRole('figure', { name: '전환 비율' })).toHaveAttribute(
      'data-shown',
      'false'
    );
  });

  it('draws a faint and a solid line per series', () => {
    const { container } = renderChart();
    expect(
      container.querySelectorAll('g[data-layer="ahead"] polyline')
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('g[data-layer="past"] polyline')
    ).toHaveLength(2);
    expect(container.querySelector('clipPath rect')).toHaveAttribute(
      'width',
      '1040'
    );
  });

  it('labels the y axis with formatted ticks', () => {
    renderChart();
    ['0%', '25%', '50%', '75%', '100%'].forEach((tick) => {
      expect(screen.getAllByText(tick).length).toBeGreaterThan(0);
    });
  });

  it('exposes the data as a table for screen readers', () => {
    renderChart();
    const table = screen.getByRole('table', { name: '전환 비율' });
    expect(
      within(table).getByRole('columnheader', { name: '월' })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('row', { name: '3월 96% 4%' })
    ).toBeInTheDocument();
  });

  it('thins x labels to fit the default width', () => {
    const labels = Array.from({ length: 23 }, (_, i) => `w${i}`);
    const { container } = renderChart({
      labels,
      series: [{ name: 'a', values: labels.map((_, i) => i) }],
      min: null,
      max: null,
    });
    const axis = container.querySelector('[data-axis="x"]');
    expect(within(axis).getByText('w3')).toBeInTheDocument();
    expect(within(axis).queryByText('w1')).not.toBeInTheDocument();
  });

  it('falls back to a generic name without a title', () => {
    renderChart({ title: null });
    expect(screen.getByRole('group', { name: /^선 그래프\./ })).toHaveAttribute(
      'tabindex',
      '0'
    );
  });
});
