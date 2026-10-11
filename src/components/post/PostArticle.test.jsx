import theme from '@styles/theme/theme';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostArticle from './PostArticle';

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal()),
  animate: vi.fn(),
  useInView: vi.fn(),
  useReducedMotion: vi.fn(),
}));

function renderArticle(content) {
  return render(
    <ThemeProvider theme={theme}>
      <PostArticle content={content} />
    </ThemeProvider>
  );
}

const chartSource = (value) =>
  `\`\`\`chart\ntitle: 전환 비율\n---\n월, a\n1월, 1\n2월, ${value}\n\`\`\``;

beforeEach(() => {
  animate.mockReset().mockImplementation(() => ({ stop: vi.fn() }));
  useInView.mockReset().mockReturnValue(true);
  useReducedMotion.mockReset().mockReturnValue(false);
});

afterEach(() => {
  delete navigator.clipboard;
});

describe('PostArticle', () => {
  it('renders chart code blocks as charts and keeps other code highlighted', () => {
    const { container } = renderArticle(
      '```chart\ntitle: 전환 비율\n---\n월, a\n1월, 1\n2월, 2\n```\n\n```js\nconst a = 1;\n```'
    );
    expect(
      screen.getByRole('figure', { name: '전환 비율' })
    ).toBeInTheDocument();
    expect(container.querySelector('code.hljs.language-js')).not.toBeNull();
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(1);
  });

  it('shows the syntax error under the code while a chart is being typed', () => {
    const { rerender } = renderArticle('```chart\n월, a\n1월, x\n```');
    expect(screen.getByText(/^차트 문법 오류 · /)).toBeInTheDocument();
    rerender(
      <ThemeProvider theme={theme}>
        <PostArticle content={'```chart\n월, a\n1월, 1\n2월, 2\n```'} />
      </ThemeProvider>
    );
    expect(screen.queryByText(/^차트 문법 오류 · /)).not.toBeInTheDocument();
    expect(screen.getByRole('figure')).toBeInTheDocument();
  });

  it('keeps the chart mounted and does not replay the draw-in while editing', () => {
    const { rerender } = renderArticle(chartSource(2));
    rerender(
      <ThemeProvider theme={theme}>
        <PostArticle content={chartSource(3)} />
      </ThemeProvider>
    );
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('shows a finished chart in full after a syntax error is fixed', () => {
    const { container, rerender } = renderArticle(chartSource(2));
    act(() => animate.mock.calls[0][2].onComplete());
    const show = (content) =>
      rerender(
        <ThemeProvider theme={theme}>
          <PostArticle content={content} />
        </ThemeProvider>
      );
    show(chartSource('x'));
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    show(chartSource(3));
    expect(animate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('clipPath rect')).toHaveAttribute(
      'width',
      '1040'
    );
    expect(container.querySelector('g[data-layer="ahead"]').style.opacity).toBe(
      '1'
    );
  });

  it('adds Korean slug ids to h2 and h3', () => {
    renderArticle('## 소개 Intro!\n\n### Spring Boot 3.4 적용기');
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      '소개-intro'
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute(
      'id',
      'spring-boot-34-적용기'
    );
  });

  it('copies a heading link from the anchor button', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderArticle('## 소개');

    fireEvent.click(
      screen.getByRole('button', { name: '이 제목의 링크 복사' })
    );

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('#%EC%86%8C%EA%B0%9C')
    );
  });

  it('renders raw HTML as text, never as elements', () => {
    const { container } = renderArticle(
      '<script>alert(1)</script>\n\n<b>bold</b>'
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<b>bold</b>')).toBeInTheDocument();
  });

  it('strips javascript: links', () => {
    renderArticle('[x](javascript:alert(1))');
    expect(screen.getByText('x').getAttribute('href') || '').not.toContain(
      'javascript'
    );
  });

  it('highlights fenced code', () => {
    const { container } = renderArticle('```java\nint a = 1;\n```');
    expect(container.querySelector('code.hljs.language-java')).not.toBeNull();
  });
});
