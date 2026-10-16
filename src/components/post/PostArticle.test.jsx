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

  it('replays a chart when the post page asks for it, and not in the editor preview', () => {
    const barSource = '```chart\ntype: bar\n---\n월, a\n1월, 1\n2월, 2\n```';
    const grown = (container) =>
      container.querySelector('figure').getAttribute('data-grown');
    const seen = ({ half, any }) =>
      useInView.mockImplementation((_ref, options) =>
        options?.amount === 0.5 ? half : any
      );
    const article = (props) => (
      <ThemeProvider theme={theme}>
        <PostArticle content={barSource} {...props} />
      </ThemeProvider>
    );

    seen({ half: true, any: true });
    const page = render(article({ replayCharts: true }));
    expect(grown(page.container)).toBe('true');
    seen({ half: false, any: true });
    page.rerender(article({ replayCharts: true }));
    expect(grown(page.container)).toBe('true');
    seen({ half: false, any: false });
    page.rerender(article({ replayCharts: true }));
    expect(grown(page.container)).toBe('false');
    page.unmount();

    // Without the prop (the editor preview) the chart keeps its watch-once behavior.
    useInView.mockClear();
    render(article({}));
    expect(useInView).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ once: true, amount: 0.5 })
    );
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

  describe('extra blank lines between blocks', () => {
    const gapOf = (element) => element.getAttribute('data-gap');

    it('adds 20px of space for each blank line beyond the first', () => {
      const { container } = renderArticle(
        '첫 문단\n\n둘째\n\n\n셋째\n\n\n\n넷째'
      );
      const [first, second, third, fourth] = container.querySelectorAll('p');

      expect(gapOf(first)).toBeNull();
      expect(gapOf(second)).toBeNull();
      expect(gapOf(third)).toBe('1');
      expect(declaredValue(third, '--gap-extra')).toBe('20px');
      expect(gapOf(fourth)).toBe('2');
      expect(declaredValue(fourth, '--gap-extra')).toBe('40px');
    });

    it('stops at 3 extra blank lines, 60px', () => {
      const { container } = renderArticle('위\n\n\n\n\n\n\n\n\n아래');
      const [, below] = container.querySelectorAll('p');

      expect(gapOf(below)).toBe('3');
      expect(declaredValue(below, '--gap-extra')).toBe('60px');
    });

    it('opens up the space before an image as well', () => {
      const { container } = renderArticle(
        '텍스트\n\n\n![설명](https://a/b.png)'
      );
      const imageParagraph = container.querySelector('img').closest('p');

      expect(gapOf(imageParagraph)).toBe('1');
    });

    it('wraps code, chart and quote blocks so their own margins add up', () => {
      const { container } = renderArticle(
        '앞\n\n\n```js\nconst a = 1;\n```\n\n\n> 인용\n\n\n- 목록\n\n\n## 제목'
      );
      const marked = [...container.querySelectorAll('[data-gap]')];

      expect(marked.map((element) => element.tagName)).toEqual([
        'DIV',
        'DIV',
        'UL',
        'H2',
      ]);
      expect(marked[0].querySelector('pre')).not.toBeNull();
      expect(marked[1].querySelector('blockquote')).not.toBeNull();
    });

    it('leaves blank lines inside a code block alone', () => {
      const { container } = renderArticle(
        '```js\nconst a = 1;\n\n\n\nconst b = 2;\n```\n\n끝'
      );

      expect(container.querySelector('[data-gap]')).toBeNull();
    });
  });

  it('uses one 20px margin above paragraphs and titles and none below', () => {
    const { container } = renderArticle(
      '앞\n\n## 섹션\n\n본문\n\n### 소제목\n\n본문'
    );
    const h2 = container.querySelector('h2');
    const h3 = container.querySelector('h3');

    // Each of them leaves 4.5px of empty line space above and below its letters, so a
    // 20px margin comes out as 20 + 4.5 + 4.5 = 29px from letters to letters, with no
    // line height to work out for each kind of text.
    expect(declaredValue(container.querySelector('p'), 'margin')).toBe(
      '20px 0px 0px'
    );
    expect(declaredValue(h2, 'margin-top')).toBe('20px');
    expect(declaredValue(h3, 'margin-top')).toBe('20px');
    expect(declaredValue(h2, 'margin-bottom')).toBeNull();
    expect(declaredValue(h3, 'margin-bottom')).toBeNull();
  });

  it('lays the article out as a column, so neighbouring margins add up instead of merging', () => {
    const { container } = renderArticle('앞\n\n뒤');
    const body = container.firstElementChild;

    expect(declaredValue(body, 'display')).toBe('flex');
    expect(declaredValue(body, 'flex-direction')).toBe('column');
  });

  describe('empty space around text', () => {
    // The line box is line-height tall and the letters are font-size tall, so the empty
    // space above and below the letters is (line-height - font-size) / 2. It is 4.5px
    // for every kind of text in the article.
    const space = (element) => {
      const size = parseFloat(declaredValue(element, 'font-size'));
      const line = parseFloat(declaredValue(element, 'line-height'));
      return (line - size) / 2;
    };

    it('leaves 4.5px above and below the body text, h2 and h3', () => {
      const { container } = renderArticle('## 제목\n\n본문\n\n### 소제목');

      expect(space(container.firstElementChild)).toBe(4.5);
      expect(space(container.querySelector('h2'))).toBe(4.5);
      expect(space(container.querySelector('h3'))).toBe(4.5);
    });

    it('gives a paragraph that holds only an image 4.5px above and below the image', () => {
      const { container } = renderArticle(
        '텍스트\n\n![설명](https://a/b.png)\n\n![캡션](https://a/c.png "그림 1")'
      );
      const [, plain, captioned] = container.querySelectorAll('p');

      for (const block of [plain, captioned]) {
        expect(block).toHaveAttribute('data-image');
        expect(declaredValue(block, 'padding-top')).toBe(
          'calc(var(--gap-extra, 0px) + 4.5px)'
        );
        expect(declaredValue(block, 'padding-bottom')).toBe('4.5px');
      }
      expect(plain.querySelector('img')).toHaveStyle({ display: 'block' });
      expect(
        declaredValue(captioned.querySelector('[data-figure]'), 'margin')
      ).toBe('0px');
    });

    it('leaves a paragraph that mixes text and an image, or holds several images, as it was', () => {
      const { container } = renderArticle(
        '앞 글 ![작은](https://a/b.png) 뒤 글\n\n![하나](https://a/c.png)\n![둘](https://a/d.png)'
      );

      for (const block of container.querySelectorAll('p')) {
        expect(block).not.toHaveAttribute('data-image');
      }
    });
  });

  it('puts 4.5px outside every block that is not a line of text, as text has inside', () => {
    const { container } = renderArticle(
      [
        '문단',
        '- 목록',
        '> 인용',
        '> [!NOTE]\n> 안내',
        '```js\nconst a = 1;\n```',
        '```tree\n루트\n  자식\n```',
        '```chart\ntitle: 제목\n---\n월, a\n1월, 1\n2월, 2\n```',
        '| a | b |\n| - | - |\n| 1 | 2 |',
      ].join('\n\n')
    );
    const blocks = [...container.firstElementChild.children];

    expect(blocks.map((block) => block.tagName)).toEqual([
      'P',
      'UL',
      'BLOCKQUOTE',
      'DIV',
      'DIV',
      'DIV',
      'FIGURE',
      'TABLE',
    ]);
    expect(declaredValue(blocks[0], 'margin')).toBe('20px 0px 0px');
    // 20px of gap plus 4.5px on top, and 4.5px below, so the letters of the text next to
    // the block are 29px away on either side.
    for (const block of blocks.slice(1)) {
      expect(declaredValue(block, 'margin')).toBe('24.5px 0px 4.5px');
    }
  });

  it('keeps the # link of a title on the title line when blank lines open space above it', () => {
    const { container } = renderArticle('앞\n\n\n\n\n## 제목\n\n본문');
    const h2 = container.querySelector('h2');
    const anchor = h2.querySelector('[data-heading-anchor]');

    // The extra blank lines become padding on top of the title, and the button is
    // positioned from the padding edge, so it has to start below that padding.
    expect(h2).toHaveAttribute('data-gap', '3');
    expect(declaredValue(h2, '--gap-extra')).toBe('60px');
    expect(declaredValue(anchor, 'top')).toBe('var(--gap-extra, 0px)');
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

  it('sizes an image by a percent or pixel width in the alt text', () => {
    const { container } = renderArticle(
      '![절반 | 50%](https://a/b.png)\n\n![고정 | border | 300px | center](https://a/c.png)\n\n![원래](https://a/d.png)'
    );
    const [half, fixed, plain] = container.querySelectorAll('img');

    expect(half).toHaveAttribute('alt', '절반');
    expect(half.style.width).toBe('50%');
    expect(fixed).toHaveAttribute('alt', '고정');
    expect(fixed.style.width).toBe('300px');
    expect(fixed).toHaveAttribute('data-border');
    expect(fixed).toHaveAttribute('data-center');
    expect(plain.style.width).toBe('');
  });

  it('leaves out-of-range or malformed widths in the alt text', () => {
    const { container } = renderArticle(
      '![넓게 | 150%](https://a/b.png)\n\n![영 | 0px](https://a/c.png)\n\n![소수 | 12.5%](https://a/d.png)\n\n![단위 | 50em](https://a/e.png)'
    );
    const images = [...container.querySelectorAll('img')];

    expect(images.map((image) => image.getAttribute('alt'))).toEqual([
      '넓게 | 150%',
      '영 | 0px',
      '소수 | 12.5%',
      '단위 | 50em',
    ]);
    for (const image of images) expect(image.style.width).toBe('');
  });

  it('sizes a captioned image through its figure so the caption follows', () => {
    const { container } = renderArticle(
      '![차트 | 60%](https://a/b.png "그림 1")'
    );
    const figure = container.querySelector('[data-figure]');

    expect(figure.style.width).toBe('60%');
    expect(figure.querySelector('img').style.width).toBe('100%');
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
