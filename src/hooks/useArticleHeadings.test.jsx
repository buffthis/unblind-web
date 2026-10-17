import PostArticle from '@components/post/PostArticle';
import theme from '@styles/theme/theme';
import { act, render, screen } from '@testing-library/react';
import React, { useRef } from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useArticleHeadings, {
  readHeadings,
  useActiveHeading,
  useScrollToHash,
} from './useArticleHeadings';

function Probe({ content, onHeadings }) {
  const ref = useRef(null);
  const headings = useArticleHeadings(ref, content);
  onHeadings(headings);
  return (
    <ThemeProvider theme={theme}>
      <PostArticle ref={ref} content={content} />
    </ThemeProvider>
  );
}

describe('readHeadings', () => {
  it('returns [] without a root', () => {
    expect(readHeadings(null)).toEqual([]);
  });
});

describe('useArticleHeadings', () => {
  it('reads h2/h3 with ids and excludes the anchor button text', () => {
    const onHeadings = vi.fn();
    render(
      <Probe
        content={'## 소개\n\n### 배경\n\n#### 무시'}
        onHeadings={onHeadings}
      />
    );

    expect(onHeadings).toHaveBeenLastCalledWith([
      { id: '소개', level: 2, text: '소개' },
      { id: '배경', level: 3, text: '배경' },
    ]);
  });

  it('leaves the footnote label out of the toc', () => {
    const onHeadings = vi.fn();
    render(
      <Probe
        content={'## 소개\n\n본문[^1]\n\n[^1]: 각주'}
        onHeadings={onHeadings}
      />
    );

    expect(onHeadings).toHaveBeenLastCalledWith([
      { id: '소개', level: 2, text: '소개' },
    ]);
  });
});

function HashProbe({ ready }) {
  useScrollToHash(ready);
  return <h2 id="소개">소개</h2>;
}

describe('useScrollToHash', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('scrolls to an encoded Korean fragment once ready', () => {
    window.history.replaceState(null, '', '/posts/3#%EC%86%8C%EA%B0%9C');
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');

    const { rerender } = render(<HashProbe ready={false} />);
    expect(scroll).not.toHaveBeenCalled();

    rerender(<HashProbe ready />);
    expect(scroll).toHaveBeenCalledTimes(1);
    scroll.mockRestore();
  });
});

describe('useActiveHeading', () => {
  const headings = [
    { id: 'first', level: 2, text: '첫 제목' },
    { id: 'second', level: 2, text: '둘째 제목' },
  ];
  let callback;

  function Probe() {
    const active = useActiveHeading(headings);
    return (
      <>
        <h2 id="first">첫 제목</h2>
        <h2 id="second">둘째 제목</h2>
        <p data-testid="active">{active ?? 'none'}</p>
      </>
    );
  }

  const scrollTo = (y) => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  };
  const place = (id, top) => {
    document.getElementById(id).getBoundingClientRect = () => ({
      top,
      bottom: top + 30,
    });
  };
  const enter = (id, top) =>
    act(() =>
      callback([
        {
          isIntersecting: true,
          target: document.getElementById(id),
          boundingClientRect: { top },
        },
      ])
    );
  const scrolled = (y) =>
    act(() => {
      scrollTo(y);
      window.dispatchEvent(new Event('scroll'));
    });
  const active = () => screen.getByTestId('active').textContent;

  beforeEach(() => {
    window.IntersectionObserver = class {
      constructor(next) {
        callback = next;
      }
      observe() {}
      disconnect() {}
    };
    scrollTo(0);
    // The active band runs from the 44px header to 30% of the 768px window, 230px.
    window.innerHeight = 768;
  });

  afterEach(() => {
    scrollTo(0);
  });

  it('highlights nothing at the top of the page, even with the first heading already in view', () => {
    render(<Probe />);
    place('first', 200);
    place('second', 900);

    enter('first', 200);

    expect(active()).toBe('none');
  });

  it('picks the heading in view as soon as the page is scrolled, without waiting for another to enter', () => {
    render(<Probe />);
    place('first', 200);
    place('second', 900);
    enter('first', 200);

    place('first', 150);
    scrolled(50);

    expect(active()).toBe('first');
  });

  it('follows the heading that enters the band while scrolling', () => {
    render(<Probe />);
    scrollTo(400);
    place('first', -150);
    place('second', 180);

    enter('second', 180);

    expect(active()).toBe('second');
  });

  it('highlights the heading in view when the page opens already scrolled', () => {
    scrollTo(900);
    render(<Probe />);
    place('first', 100);

    enter('first', 100);

    expect(active()).toBe('first');
  });

  it('clears the highlight again when the page is scrolled back to the top', () => {
    render(<Probe />);
    scrollTo(300);
    place('first', 100);
    place('second', 700);
    enter('first', 100);
    expect(active()).toBe('first');

    place('first', 200);
    scrolled(0);

    expect(active()).toBe('none');
  });
});
