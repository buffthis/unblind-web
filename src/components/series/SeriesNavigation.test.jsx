import theme from '@styles/theme/theme';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
function stubHover(canHover) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query === '(hover: hover)' ? canHover : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('series reading navigation', () => {
  beforeEach(() => stubHover(true));
  afterEach(() => vi.restoreAllMocks());
  it('toggles the list with a tap on screens without hover', () => {
    stubHover(false);
    renderNav(3);
    const banner = screen.getByRole('navigation', { name: '이 글의 시리즈' });
    fireEvent.mouseEnter(banner);
    expect(
      screen.queryByRole('list', { name: '시리즈 회차' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('3편 중 2번째'));
    expect(
      screen.getByRole('list', { name: '시리즈 회차' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('3편 중 2번째'));
    expect(
      screen.queryByRole('list', { name: '시리즈 회차' })
    ).not.toBeInTheDocument();
  });
  it('numbers only public chapters and marks the current chapter', () => {
    renderNav(3);
    expect(screen.getByText('서비스 만들기')).toBeInTheDocument();
    expect(screen.getByText('3편 중 2번째')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: '이 글의 시리즈' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: '시리즈 회차' })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /전체 회차/ })
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(
      screen.getByRole('navigation', { name: '이 글의 시리즈' })
    );
    const list = screen.getByRole('list', { name: '시리즈 회차' });
    const current = within(list).getByText('운영').closest('[aria-current]');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).not.toBe('A');
    expect(within(list).getByText('시작').closest('a')).toHaveAttribute(
      'href',
      '/posts/1'
    );
    expect(screen.queryByText('숨긴 글')).not.toBeInTheDocument();
  });
  it('steps to the neighbouring public chapters and closes the list on leave or Escape', () => {
    renderNav(3);
    expect(screen.getByRole('link', { name: '이전 글: 시작' })).toHaveAttribute(
      'href',
      '/posts/1'
    );
    expect(screen.getByRole('link', { name: '다음 글: 회고' })).toHaveAttribute(
      'href',
      '/posts/4'
    );
    const banner = screen.getByRole('navigation', { name: '이 글의 시리즈' });
    const listShown = () => screen.queryByRole('list', { name: '시리즈 회차' });

    fireEvent.mouseEnter(banner);
    expect(listShown()).toBeInTheDocument();
    fireEvent.mouseLeave(banner);
    expect(listShown()).not.toBeInTheDocument();

    fireEvent.mouseEnter(banner);
    fireEvent.keyDown(banner, { key: 'Escape' });
    expect(listShown()).not.toBeInTheDocument();
  });
  it('disables the step that has no chapter', () => {
    renderNav(1);
    expect(screen.getByRole('button', { name: '이전 글 없음' })).toBeDisabled();
    expect(
      screen.getByRole('link', { name: '다음 글: 운영' })
    ).toBeInTheDocument();
  });
  it('continues to the next public chapter across a hidden entry', () => {
    renderNav(1, 'bottom');
    expect(
      screen.getByRole('navigation', { name: '시리즈 이어 읽기' })
    ).toBeInTheDocument();
    const nextCard = screen.getByRole('link', { name: /다음 글 운영/ });
    expect(nextCard).toHaveAttribute('href', '/posts/3');
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
    expect(screen.getByText('1편 중 1번째')).toBeInTheDocument();
  });
  it('does not navigate using a post that is no longer in the series', () => {
    const { container } = renderNav(99);
    expect(container).toBeEmptyDOMElement();
  });
});
