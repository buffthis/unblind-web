import { useAuth } from '@contexts/AuthContext';
import usePost from '@hooks/usePost';
import theme from '@styles/theme/theme';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostPage from './PostPage';

vi.mock('@components/header/BasicHeader', () => ({ default: () => null }));
vi.mock('@components/common/Footer', () => ({ default: () => null }));
vi.mock('@hooks/usePost', () => ({ default: vi.fn() }));
vi.mock('@contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/config', async (importOriginal) => ({
  ...(await importOriginal()),
  POST_EDITOR_ENABLED: true,
}));

const basePost = {
  id: 3,
  title: '글 제목',
  subtitle: '부제목',
  content: '## 소개\n\n본문입니다.',
  createdAt: '2026-10-01T09:00:00',
  thumbnail: { url: 'https://i.imgur.com/a.png', altText: '썸네일' },
  author: { id: 7, username: 'hyeongjun', name: '형준' },
};

function renderPage() {
  return render(
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/posts/3']}>
          <Routes>
            <Route path="/posts/:postId" element={<PostPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  usePost.mockReset();
  useAuth.mockReturnValue({ user: null, loading: false });
});

describe('PostPage', () => {
  it('shows the title before the thumbnail', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    const title = screen.getByRole('heading', { level: 1, name: '글 제목' });
    const thumbnail = screen.getByAltText('썸네일');
    expect(
      title.compareDocumentPosition(thumbnail) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows author, date and reading time in the meta row', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    expect(screen.getAllByRole('link', { name: '형준' })[0]).toHaveAttribute(
      'href',
      '/hyeongjun'
    );
    expect(screen.getByText('2026.10.01')).toBeInTheDocument();
    expect(screen.getByText('1분 읽기')).toBeInTheDocument();
  });

  it('builds the table of contents from the rendered article', async () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    // The aside is display:none below 1200px, and jsdom ignores media queries,
    // so the query has to include hidden elements.
    expect(
      await screen.findByRole('navigation', { name: '목차', hidden: true })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '소개', hidden: true })
    ).toBeInTheDocument();
  });

  it('falls back to the external link when there is no content', () => {
    usePost.mockReturnValue({
      post: {
        ...basePost,
        content: '',
        externalUrl: 'https://shady-dev.tistory.com/1',
      },
      loading: false,
      error: false,
    });
    renderPage();

    expect(screen.getByRole('link', { name: '원문 보러가기' })).toHaveAttribute(
      'href',
      'https://shady-dev.tistory.com/1'
    );
    expect(screen.queryByText(/분 읽기/)).not.toBeInTheDocument();
  });

  it('shows the error state when the post is missing', () => {
    usePost.mockReturnValue({ post: null, loading: false, error: true });
    renderPage();

    expect(screen.getByText('포스트를 불러올 수 없습니다')).toBeInTheDocument();
  });

  it('omits the author when the backend sends none', () => {
    usePost.mockReturnValue({
      post: { ...basePost, author: null },
      loading: false,
      error: false,
    });
    renderPage();

    expect(
      screen.queryByRole('link', { name: '형준' })
    ).not.toBeInTheDocument();
  });

  it('shows the edit link to the author only', () => {
    useAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    expect(screen.getByRole('link', { name: '수정' })).toHaveAttribute(
      'href',
      '/posts/3/edit'
    );
  });

  it('hides the edit link from other users', () => {
    useAuth.mockReturnValue({ user: { id: 8 }, loading: false });
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    expect(
      screen.queryByRole('link', { name: '수정' })
    ).not.toBeInTheDocument();
  });

  it('hides the edit link from anonymous visitors', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    expect(
      screen.queryByRole('link', { name: '수정' })
    ).not.toBeInTheDocument();
  });
});
