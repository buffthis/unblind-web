import theme from '@styles/theme/theme';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';

import LineChart from './LineChart';

// jsdom does not lay anything out, so read what the stylesheet declares for the element.
function declaredValue(element, property) {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule.selectorText && element.matches(rule.selectorText)) {
        const value = rule.style.getPropertyValue(property);
        if (value) return value;
      }
    }
  }
  return null;
}

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

  it('draws a faint and a solid line per series, hidden until drawn in', () => {
    const { container } = renderChart();
    expect(
      container.querySelectorAll('g[data-layer="ahead"] polyline')
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('g[data-layer="past"] polyline')
    ).toHaveLength(2);
    expect(container.querySelector('clipPath rect')).toHaveAttribute(
      'width',
      '0'
    );
  });

  it('draws a reference line across the plot', () => {
    const { container } = renderChart({ limit: { value: 80, label: '목표' } });
    const limit = container.querySelector('[data-role="limit"]');
    expect(parseFloat(limit.style.top)).toBeCloseTo(20);
    expect(limit).toHaveTextContent('목표 80%');
  });

  // Every gap between blocks is 20px, with 4.5px of empty space inside the line box of the
  // text on either side, so the letters end up 29px apart. The legend is text, and the
  // x-axis labels above it and the paragraph below it are the neighbours it is measured to.
  describe('the gaps around the legend', () => {
    it('keeps the legend 24.5px under the axis, which with its own 4.5px of line space is 29px', () => {
      const { container } = renderChart();
      const legend = container.querySelector('[data-role="legend"]');

      expect(declaredValue(legend, 'margin-top')).toBe('24.5px');
      expect(declaredValue(legend, 'line-height')).toBe('calc(9px + 0.8rem)');
    });

    it('leaves nothing under the axis labels but that margin', () => {
      renderChart();
      const frame = screen.getByRole('group').parentElement;

      expect(declaredValue(frame, 'padding')).toBe('40px 0px 0px');
    });

    it('ends the figure right at the legend, as text, so the next block is 20 + 4.5 away', () => {
      renderChart();
      const figure = screen.getByRole('figure', { name: '전환 비율' });

      expect(declaredValue(figure, 'margin')).toBe('20px 0px 0px');
    });

    it('opens a chart with a title like a line of text: 20px, with the title keeping its own 4.5px', () => {
      const { container } = renderChart();
      const title = container.querySelector('figcaption');

      expect(declaredValue(title, 'line-height')).toBe('calc(9px + 0.9rem)');
    });

    it('opens a chart with no title like a block that is not text, which has 4.5px less inside', () => {
      renderChart({ title: null });
      const figure = screen.getByRole('figure', { name: '선 그래프' });

      expect(declaredValue(figure, 'margin')).toBe('24.5px 0px 0px');
    });
  });

  describe('notes', () => {
    const note = (overrides) => ({
      index: 1,
      seriesIndex: 0,
      at: '2월',
      series: 'a',
      text: '절반 · {value}',
      ...overrides,
    });

    it('writes a note beside its point, with the value filled in', () => {
      const { container } = renderChart({ notes: [note()] });
      const text = container.querySelector('[data-role="note"]');
      expect(text).toHaveTextContent('절반 · 50%');
      expect(text).toHaveAttribute('data-flip', 'false');
      expect(text.style.top).toBe('50%');
      const ring = container.querySelector('[data-role="note-ring"]');
      expect(ring.style.left).toBe('50%');
      expect(ring.style.top).toBe('50%');
    });

    it('turns a note left of its point near the right edge', () => {
      const { container } = renderChart({
        notes: [note({ index: 2, seriesIndex: 1, at: '3월', series: 'b' })],
      });
      expect(container.querySelector('[data-role="note"]')).toHaveAttribute(
        'data-flip',
        'true'
      );
    });

    it('stacks notes that would sit on one another and joins each to its point', () => {
      const { container } = renderChart({
        notes: [note(), note({ seriesIndex: 1, series: 'b', text: '같은 값' })],
      });
      const [first, second] = container.querySelectorAll('[data-role="note"]');
      expect(first.style.top).toBe('50%');
      expect(second.style.top).toBe('59%');
      expect(
        container.querySelectorAll('[data-role="note-leader"]')
      ).toHaveLength(1);
    });

    it('draws no leader for a note that sits level with its point', () => {
      const { container } = renderChart({ notes: [note()] });
      expect(container.querySelector('[data-role="note-leader"]')).toBeNull();
    });

    it('fades the notes in together with the lines that are drawn in', () => {
      const { container } = renderChart({ notes: [note()] });
      const notes = container.querySelector('[data-role="notes"]');
      const ahead = container.querySelector('g[data-layer="ahead"]');
      expect(notes.style.opacity).toBe(ahead.style.opacity);
    });

    it('lists the notes in the table caption', () => {
      renderChart({ notes: [note()] });
      expect(
        screen
          .getByRole('table', { name: '전환 비율' })
          .querySelector('caption')
      ).toHaveTextContent('a 2월: 절반 · 50%');
    });
  });

  describe('a chart with a great many rows', () => {
    const rows = 20000;
    const many = {
      labels: Array.from({ length: rows }, (_, i) => `${i}초`),
      series: [
        { name: 'a', values: Array.from({ length: rows }, (_, i) => i % 100) },
      ],
    };

    it('gives the screen reader a table of 200 rows spread over the data once it passes 5000, with the ends in it', () => {
      renderChart(many);
      const table = screen.getByRole('table', { name: '전환 비율' });
      const body = within(table).getAllByRole('row').slice(1);
      expect(body).toHaveLength(200);
      expect(within(body[0]).getByRole('rowheader')).toHaveTextContent('0초');
      expect(within(body[199]).getByRole('rowheader')).toHaveTextContent(
        '19999초'
      );
    });

    it('says in the caption that the table holds only some of the rows', () => {
      renderChart(many);
      expect(
        screen
          .getByRole('table', { name: '전환 비율' })
          .querySelector('caption')
      ).toHaveTextContent('전체 20,000행 중 200행');
    });

    it('keeps the whole table of a chart with few rows', () => {
      renderChart();
      const table = screen.getByRole('table', { name: '전환 비율' });
      expect(within(table).getAllByRole('row')).toHaveLength(1 + 3);
      expect(table.querySelector('caption').textContent).not.toContain('전체');
    });
  });

  describe('a series that ends early', () => {
    const ended = {
      labels: ['1월', '2월', '3월', '4월'],
      series: [
        { name: 'a', values: [10, 50, 96, 80] },
        { name: 'b', values: [90, 50, null, null] },
      ],
    };

    it('stops the line at its last value and marks the end with a dot', () => {
      const { container } = renderChart(ended);
      const lines = container.querySelectorAll('g[data-layer="past"] polyline');
      // Two lines, one per series, then one end dot for the series that ended.
      expect(lines).toHaveLength(3);
      expect(lines[1].getAttribute('points')).toBe('0.00 100.00 333.33 500.00');
      const ends = container.querySelectorAll('[data-role="end"]');
      expect(ends).toHaveLength(1);
      expect(ends[0].getAttribute('points')).toBe(
        '333.33 500.00 333.33 500.00'
      );
    });

    it('draws no end dot for a series that runs to the last row', () => {
      const { container } = renderChart();
      expect(container.querySelectorAll('[data-role="end"]')).toHaveLength(0);
    });

    it('shows a dash in the table for the rows after the end', () => {
      renderChart(ended);
      const row = screen.getByRole('row', { name: /4월/ });
      expect(
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent)
      ).toEqual(['80%', '-']);
    });
  });

  describe('where the text of a guide sits', () => {
    const label = (container, role) =>
      container.querySelector(`[data-role="${role}"] span`);

    it('puts the text of a horizontal line or range at the right unless told otherwise', () => {
      const { container } = renderChart({
        limit: { value: 80, label: '목표' },
        band: { from: 10, to: 20, label: '구간' },
      });
      expect(label(container, 'limit')).toHaveAttribute('data-align', 'right');
      expect(label(container, 'range')).toHaveAttribute('data-align', 'right');
    });

    it('moves the text of a horizontal line or range along it', () => {
      const { container } = renderChart({
        limit: { value: 80, label: '목표', align: 'left' },
        band: { from: 10, to: 20, label: '구간', align: 'center' },
      });
      expect(label(container, 'limit')).toHaveAttribute('data-align', 'left');
      expect(label(container, 'range')).toHaveAttribute('data-align', 'center');
    });

    it('puts the text of a vertical line or range at the top unless told otherwise', () => {
      const { container } = renderChart({
        xlimit: { index: 1, at: '2월', label: '출시' },
        xband: {
          fromIndex: 0,
          toIndex: 1,
          from: '1월',
          to: '2월',
          label: '구간',
        },
      });
      expect(label(container, 'xlimit')).toHaveAttribute('data-align', 'top');
      expect(label(container, 'xrange')).toHaveAttribute('data-align', 'top');
    });

    it('moves the text of a vertical line or range up and down it', () => {
      const { container } = renderChart({
        xlimit: { index: 1, at: '2월', label: '출시', align: 'bottom' },
        xband: {
          fromIndex: 0,
          toIndex: 1,
          from: '1월',
          to: '2월',
          label: '구간',
          align: 'middle',
        },
      });
      expect(label(container, 'xlimit')).toHaveAttribute(
        'data-align',
        'bottom'
      );
      expect(label(container, 'xrange')).toHaveAttribute(
        'data-align',
        'middle'
      );
    });

    it('writes only the point when a vertical guide has no name', () => {
      const { container } = renderChart({
        xlimit: { index: 1, at: '14분', label: null },
        xband: {
          fromIndex: 0,
          toIndex: 1,
          from: '1월',
          to: '2월',
          label: null,
        },
      });
      expect(label(container, 'xlimit').textContent).toBe('14분');
      expect(label(container, 'xrange').textContent).toBe('1월~2월');
    });

    it('draws no text at all when the point is hidden and there is no name', () => {
      const { container } = renderChart({
        xlimit: { index: 1, at: '14분', label: null, nameOnly: true },
        xband: {
          fromIndex: 0,
          toIndex: 1,
          from: '1월',
          to: '2월',
          label: null,
          nameOnly: true,
        },
      });
      expect(container.querySelector('[data-role="xlimit"]')).not.toBeNull();
      expect(container.querySelector('[data-role="xrange"]')).not.toBeNull();
      expect(label(container, 'xlimit')).toBeNull();
      expect(label(container, 'xrange')).toBeNull();
    });

    it('writes only the name when the point is hidden, and keeps the point for the table', () => {
      const { container } = renderChart({
        xlimit: { index: 1, at: '14분', label: '출시', nameOnly: true },
        xband: {
          fromIndex: 0,
          toIndex: 1,
          from: '1월',
          to: '2월',
          label: '구간',
          nameOnly: true,
        },
      });
      expect(label(container, 'xlimit').textContent).toBe('출시');
      expect(label(container, 'xrange').textContent).toBe('구간');
      expect(
        screen
          .getByRole('table', { name: '전환 비율' })
          .querySelector('caption')
      ).toHaveTextContent('출시 14분, 구간 1월~2월');
    });
  });

  it('draws a vertical line on the point of its row', () => {
    const { container } = renderChart({
      xlimit: { index: 1, at: '2월', label: '출시' },
    });
    const line = container.querySelector('[data-role="xlimit"]');
    expect(line.style.left).toBe('50%');
    expect(line).toHaveTextContent('출시 2월');
    expect(line).toHaveAttribute('data-flip', 'false');
  });

  it('turns the name of a vertical line toward the plot when it sits near the right edge', () => {
    const { container } = renderChart({
      xlimit: { index: 2, at: '3월', label: '출시' },
    });
    expect(container.querySelector('[data-role="xlimit"]')).toHaveAttribute(
      'data-flip',
      'true'
    );
  });

  it('draws a vertical range from one point to another, under the lines', () => {
    const { container } = renderChart({
      xband: {
        fromIndex: 0,
        toIndex: 1,
        from: '1월',
        to: '2월',
        label: '장애 구간',
      },
    });
    const range = container.querySelector('[data-role="xrange"]');
    expect(range.style.left).toBe('0%');
    expect(range.style.width).toBe('50%');
    expect(range).toHaveTextContent('장애 구간 1월~2월');
    expect(
      range.compareDocumentPosition(container.querySelector('svg')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('lists the vertical guides in the table caption', () => {
    renderChart({
      limit: { value: 80, label: '목표' },
      xlimit: { index: 1, at: '2월', label: '출시' },
      xband: {
        fromIndex: 1,
        toIndex: 2,
        from: '2월',
        to: '3월',
        label: '장애 구간',
      },
    });
    expect(
      screen.getByRole('table', { name: '전환 비율' }).querySelector('caption')
    ).toHaveTextContent('목표 80%, 출시 2월, 장애 구간 2월~3월');
  });

  it.each([
    [3, '2.5'],
    [60, '2'],
    [120, '1.5'],
    [300, '1'],
  ])('draws a line of %i points %s px thick', (count, width) => {
    const labels = Array.from({ length: count }, (_, i) => `${i}초`);
    const values = Array.from({ length: count }, (_, i) => i % 50);
    const { container } = renderChart({
      labels,
      series: [{ name: 'a', values }],
    });

    expect(
      container.querySelector('g[data-layer="past"] polyline')
    ).toHaveStyle({ strokeWidth: width });
  });

  it('draws far fewer points than the data has when it is very dense', () => {
    const count = 5000;
    const labels = Array.from({ length: count }, (_, i) => `${i}초`);
    const values = Array.from({ length: count }, (_, i) => (i * 7) % 100);
    const { container } = renderChart({
      labels,
      series: [{ name: 'a', values }],
    });

    const drawn = container
      .querySelector('g[data-layer="past"] polyline')
      .getAttribute('points')
      .trim()
      .split(' ').length;
    expect(drawn / 2).toBeLessThan(2000);
    // The hidden table still lists every row for screen readers.
    expect(container.querySelectorAll('table tbody tr')).toHaveLength(count);
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

  it('sizes the left inset from the widest y-axis label', () => {
    // jsdom has no layout, so give each label a width proportional to its text.
    const offsetWidth = vi
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function width() {
        return this.dataset.role === 'ytick' ? this.textContent.length * 7 : 0;
      });
    try {
      renderChart();
      const frame = screen.getByRole('group').parentElement;
      expect(frame.style.getPropertyValue('--y-label-width')).toBe('28px');
    } finally {
      offsetWidth.mockRestore();
    }
  });

  it('keeps the default inset when labels cannot be measured', () => {
    renderChart();
    const frame = screen.getByRole('group').parentElement;
    expect(frame.style.getPropertyValue('--y-label-width')).toBe('');
  });
});
