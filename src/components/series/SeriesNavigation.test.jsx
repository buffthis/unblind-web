import theme from '@styles/theme/theme';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

import { SeriesNavigationView } from './SeriesNavigation';

const series = {
  id: 1,
  title: '서비스 만들기',
  posts: [
    { id: 1, title: '시작' },
    { id: 2, title: '숨긴 글', hidden: true },
    {
      id: 3,
      title: '운영',
      subtitle: '운영 중 쌓이는 데이터를 살피고, 다음 개선을 선택하는 기준',
      thumbnail: { url: 'https://example.com/operating.jpg' },
    },
    { id: 4, title: '회고' },
  ],
};
function renderNav(postId, placement = 'top', data = series) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <SeriesNavigationView
          series={data}
          postId={postId}
          placement={placement}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}
describe('series reading navigation', () => {
  it('numbers only public chapters and marks the current chapter', () => {
    renderNav(3);
    expect(screen.getByText('서비스 만들기')).toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*\/\s*\d+편/)).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '이 글의 시리즈' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: '시리즈 회차' });
    expect(within(list).getByText('운영').closest('a')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.queryByText('숨긴 글')).not.toBeInTheDocument();
    expect(screen.queryByText('전체 회차 보기')).not.toBeInTheDocument();
  });
  it('continues to the next public chapter across a hidden entry', () => {
    renderNav(1, 'bottom');
    expect(screen.getByRole('navigation', { name: '시리즈 이어 읽기' })).toBeInTheDocument();
    const nextCard = screen.getByRole('link', { name: /다음 글 운영/ });
    expect(nextCard).toHaveAttribute(
      'href',
      '/posts/3'
    );
    expect(nextCard.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/operating.jpg'
    );
    expect(nextCard.querySelector('strong')).toHaveTextContent('운영');
    expect(nextCard.querySelector('strong')).not.toHaveTextContent('→');
    expect(nextCard.querySelector('p')).toHaveTextContent(
      '운영 중 쌓이는 데이터를 살피고, 다음 개선을 선택하는 기준'
    );
    expect(nextCard.querySelector('div')).toHaveStyle({
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      padding: '24px',
    });
    expect(nextCard.querySelector('strong')).toHaveStyle({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    expect(nextCard.querySelector('p')).toHaveStyle({
      WebkitLineClamp: '2',
      lineHeight: '1.5',
      margin: '0px',
    });
    expect(nextCard.querySelector('img')).toHaveStyle({ objectFit: 'cover' });
    expect(screen.getByText('다음 글')).toBeInTheDocument();
    expect(screen.queryByText(/이전 ·/)).not.toBeInTheDocument();
  });
  it('distinguishes the last published chapter from a completed series', () => {
    renderNav(4, 'bottom');
    expect(screen.getByText('마지막으로 공개된 글입니다.')).toBeInTheDocument();
    expect(screen.queryByText(/이전 글/)).not.toBeInTheDocument();
    expect(screen.queryByText(/시리즈 전체 보기/)).not.toBeInTheDocument();
  });
  it('shows the series from its first published chapter', () => {
    renderNav(1, 'top', { ...series, posts: [series.posts[0]] });
    expect(screen.queryByText(/\d+\s*\/\s*\d+편/)).not.toBeInTheDocument();
  });
  it('does not navigate using a post that is no longer in the series', () => {
    const { container } = renderNav(99);
    expect(container).toBeEmptyDOMElement();
  });
});
