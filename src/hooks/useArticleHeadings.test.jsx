import PostArticle from '@components/post/PostArticle';
import theme from '@styles/theme/theme';
import { render } from '@testing-library/react';
import React, { useRef } from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useArticleHeadings, {
  readHeadings,
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
