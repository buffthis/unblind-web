import theme from '@styles/theme/theme';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

import PostToc from './PostToc';

const headings = [
  { id: '소개', level: 2, text: '소개' },
  { id: '배경', level: 3, text: '배경' },
];

function renderToc(props) {
  return render(
    <ThemeProvider theme={theme}>
      <PostToc {...props} />
    </ThemeProvider>
  );
}

describe('PostToc', () => {
  it('indents each level relative to the shallowest heading present', () => {
    renderToc({ headings, activeId: null });
    const indent = (name) =>
      getComputedStyle(screen.getByRole('link', { name }).closest('li'))
        .paddingLeft;
    expect([indent('소개'), indent('배경')]).toEqual(['12px', '24px']);
  });

  it('nests h2 and h3 one step deeper when an h1 is present', () => {
    renderToc({
      headings: [{ id: '개요', level: 1, text: '개요' }, ...headings],
      activeId: null,
    });
    const indent = (name) =>
      getComputedStyle(screen.getByRole('link', { name }).closest('li'))
        .paddingLeft;
    expect([indent('개요'), indent('소개'), indent('배경')]).toEqual([
      '12px',
      '24px',
      '36px',
    ]);
  });

  it('renders nothing without headings', () => {
    const { container } = renderToc({ headings: [], activeId: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('links to encoded fragments and marks the active heading', () => {
    renderToc({ headings, activeId: '배경' });

    expect(
      screen.getByRole('navigation', { name: '목차' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '소개' })).toHaveAttribute(
      'href',
      '#%EC%86%8C%EA%B0%9C'
    );
    expect(screen.getByRole('link', { name: '배경' })).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByRole('link', { name: '소개' })).not.toHaveAttribute(
      'aria-current'
    );
  });
});
