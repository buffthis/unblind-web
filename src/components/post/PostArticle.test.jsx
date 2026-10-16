import theme from '@styles/theme/theme';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

// jsdom does not compute border-radius, so read what the stylesheet declares for the element.
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
  it('renders chart code blocks as charts and keeps other code highlighted', async () => {
    const { container } = renderArticle(
      '```chart\ntitle: 전환 비율\n---\n월, a\n1월, 1\n2월, 2\n```\n\n```js\nconst a = 1;\n```'
    );
    expect(
      screen.getByRole('figure', { name: '전환 비율' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(container.querySelector('code.hljs.language-js')).not.toBeNull()
    );
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

  it('sets a raw HTML block in its own paragraph like any other block', () => {
    const { container } = renderArticle(
      '앞 문단\n\n<div>\n<i>x</i>\n</div>\n\n뒤 문단'
    );
    const blocks = Array.from(container.firstChild.childNodes).filter(
      (node) => node.nodeType !== Node.TEXT_NODE || node.textContent.trim()
    );
    expect(blocks.map((node) => node.nodeName)).toEqual(['P', 'P', 'P']);
    expect(blocks[1].querySelectorAll('br')).toHaveLength(2);
    expect(blocks[1].textContent.replace(/\n/g, '')).toBe(
      '<div><i>x</i></div>'
    );
  });

  it('links a footnote reference and its note both ways in Korean', () => {
    const { container } = renderArticle('본문[^1]\n\n[^1]: 출처 설명');

    const reference = container.querySelector('sup a[data-footnote-ref]');
    expect(reference).toHaveAttribute('href', '#user-content-fn-1');
    const label = screen.getByRole('heading', { name: '각주' });
    expect(label.querySelector('button')).toBeNull();
    expect(
      screen.getByRole('link', { name: '1번 각주를 단 곳으로 돌아가기' })
    ).toHaveAttribute('href', '#user-content-fnref-1');
  });

  it('strips javascript: links', () => {
    renderArticle('[x](javascript:alert(1))');
    expect(screen.getByText('x').getAttribute('href') || '').not.toContain(
      'javascript'
    );
  });

  it('highlights fenced code once the highlighter has loaded', async () => {
    const { container } = renderArticle('```java\nint a = 1;\n```');
    await waitFor(() =>
      expect(container.querySelector('code.hljs.language-java')).not.toBeNull()
    );
  });

  it('rounds body images with the theme radius', () => {
    // A different radius than the real one, so only reading it from the theme passes.
    const wider = { ...theme, radius: { ...theme.radius, md: '6px' } };
    const { container } = render(
      <ThemeProvider theme={wider}>
        <PostArticle content="![설명](https://a/b.png)" />
      </ThemeProvider>
    );

    expect(declaredValue(container.querySelector('img'), 'border-radius')).toBe(
      '6px'
    );
  });

  it('draws a border only when the alt text ends with |border', () => {
    const { container } = renderArticle(
      '![설명 | border](https://a/b.png)\n\n![그냥](https://a/c.png)'
    );
    const [bordered, plain] = container.querySelectorAll('img');

    expect(bordered).toHaveAttribute('data-border');
    expect(bordered).toHaveAttribute('alt', '설명');
    expect(bordered).toHaveStyle({ border: '1px solid #ececec' });
    expect(plain).not.toHaveAttribute('data-border');
    expect(plain).toHaveAttribute('alt', '그냥');
  });

  it('centers an image flagged |center and combines flags in any order', () => {
    const { container } = renderArticle(
      '![가운데 | center](https://a/b.png)\n\n![둘 다 | center | border](https://a/c.png)\n\n![중간 | center | 설명](https://a/d.png)'
    );
    const [centered, both, inside] = container.querySelectorAll('img');

    expect(centered).toHaveAttribute('data-center');
    expect(centered).not.toHaveAttribute('data-border');
    expect(centered).toHaveAttribute('alt', '가운데');
    expect(centered).toHaveStyle({ display: 'block', marginLeft: 'auto' });
    expect(both).toHaveAttribute('data-center');
    expect(both).toHaveAttribute('data-border');
    expect(both).toHaveAttribute('alt', '둘 다');
    expect(inside).not.toHaveAttribute('data-center');
    expect(inside).toHaveAttribute('alt', '중간 | center | 설명');
  });

  it('turns a [!NOTE] quote into an alert and keeps its body', () => {
    renderArticle('> [!WARNING]\n> 배포 전에 **백업**하세요.\n\n> 그냥 인용');
    const alert = screen.getByRole('note', { name: '경고' });

    expect(alert).toHaveTextContent('경고');
    expect(alert).toHaveTextContent('배포 전에 백업하세요.');
    expect(alert).not.toHaveTextContent('[!WARNING]');
    expect(alert.querySelector('strong')).toHaveTextContent('백업');
    expect(
      screen.queryByRole('note', { name: '참고' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('그냥 인용').closest('blockquote')).not.toBeNull();
  });

  it('accepts an alert whose body starts on the next paragraph', () => {
    renderArticle('> [!TIP]\n>\n> 두 번째 문단');
    expect(screen.getByRole('note', { name: '팁' })).toHaveTextContent(
      '두 번째 문단'
    );
  });

  it('draws a caption under an image with a markdown title', () => {
    const { container } = renderArticle(
      '![차트 | center](https://a/b.png "그림 1. 월별 방문자")'
    );
    const figure = container.querySelector('[data-figure]');
    const image = figure.querySelector('img');

    expect(image).toHaveAttribute('alt', '차트');
    expect(image).not.toHaveAttribute('title');
    expect(figure).toHaveAttribute('data-center');
    expect(figure.querySelector('[data-caption]')).toHaveTextContent(
      '그림 1. 월별 방문자'
    );
    expect(figure.querySelector('[data-caption]')).toHaveStyle({
      textAlign: 'center',
    });
  });

  it('draws no figure for an image without a title', () => {
    const { container } = renderArticle('![그냥](https://a/c.png)');
    expect(container.querySelector('[data-figure]')).toBeNull();
  });

  it('renders $$ math once KaTeX has loaded and leaves single dollars as text', async () => {
    const { container } = renderArticle(
      '가격은 $5 에서 $10 입니다. 식은 $$x^2$$ 입니다.\n\n$$\n\\frac{a}{b}\n$$'
    );

    await waitFor(() =>
      expect(container.querySelectorAll('.katex').length).toBe(2)
    );
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(container).toHaveTextContent('가격은 $5 에서 $10 입니다');
  });

  it('marks ==text== as a highlight and leaves code and spaced equals alone', () => {
    const { container } = renderArticle(
      '앞 ==핵심 문장== 뒤, ==a==, `==코드==`, a == b == c'
    );

    const marks = Array.from(container.querySelectorAll('mark'));
    expect(marks.map((mark) => mark.textContent)).toEqual(['핵심 문장', 'a']);
    expect(container.querySelector('code')).toHaveTextContent('==코드==');
    expect(container).toHaveTextContent('a == b == c');
  });

  it('highlights across bold and other inline marks in either nesting', () => {
    const { container } = renderArticle(
      '==**굵게** 칠한 문장==, **==굵은 형광펜==**, ==`code` 앞==, ==**전부 굵게**=='
    );

    const marks = Array.from(container.querySelectorAll('mark'));
    expect(marks.map((mark) => mark.textContent)).toEqual([
      '굵게 칠한 문장',
      '굵은 형광펜',
      'code 앞',
      '전부 굵게',
    ]);
    expect(marks[0].querySelector('strong')).toHaveTextContent('굵게');
    expect(marks[1].parentElement.tagName).toBe('STRONG');
    expect(container).not.toHaveTextContent('==');
  });

  it('breaks the line on a single Enter and starts a paragraph on a blank line', () => {
    const { container } = renderArticle('첫 줄\n둘째 줄\n\n새 문단');

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].querySelectorAll('br')).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent('첫 줄 둘째 줄');
    expect(paragraphs[1].querySelector('br')).toBeNull();
  });

  it('leaves newlines inside code and keeps an alert marker on its own line', () => {
    const { container } = renderArticle(
      '```js\na\nb\n```\n\n> [!NOTE]\n> 본문 첫 줄\n> 둘째 줄'
    );

    expect(container.querySelector('pre code')).toHaveTextContent('a b');
    expect(container).toHaveTextContent('참고');
    expect(container).not.toHaveTextContent('[!NOTE]');
    expect(container.querySelectorAll('br')).toHaveLength(1);
  });
});
