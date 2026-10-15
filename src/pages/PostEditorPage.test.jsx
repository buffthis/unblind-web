import { fetchEditablePost } from '@apis/postApi';
import { useAuth } from '@contexts/AuthContext';
import theme from '@styles/theme/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostEditorPage from './PostEditorPage';

vi.mock('@components/header/BasicHeader', () => ({ default: () => null }));
vi.mock('@contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@apis/postApi', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchEditablePost: vi.fn(),
}));

function LoginProbe() {
  const location = useLocation();
  return <p>{`로그인 ${location.search}`}</p>;
}

function renderAt(path) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/posts/new" element={<PostEditorPage />} />
              <Route path="/posts/:postId/edit" element={<PostEditorPage />} />
              <Route path="/login" element={<LoginProbe />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  useAuth.mockReset();
  fetchEditablePost.mockReset();
  localStorage.clear();
});

describe('PostEditorPage', () => {
  it('sends anonymous visitors to login with a return path', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/posts/new');

    expect(
      screen.getByText('로그인 ?returnTo=%2Fposts%2Fnew')
    ).toBeInTheDocument();
  });

  it('opens an empty form for a new post', () => {
    useAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    renderAt('/posts/new');

    expect(screen.getByLabelText('제목')).toHaveValue('');
  });

  it("loads the owner's hidden post into the form", async () => {
    useAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    fetchEditablePost.mockResolvedValue({
      id: 3,
      title: '숨긴 글',
      subtitle: null,
      content: '본문',
      hidden: true,
      tags: ['GPU', 'React'],
      thumbnail: { url: 'https://i.imgur.com/a.png' },
      author: { id: 7, username: 'me', name: '나' },
    });
    renderAt('/posts/3/edit');

    expect(await screen.findByDisplayValue('숨긴 글')).toBeInTheDocument();
    expect(screen.getByLabelText('태그')).toHaveValue('GPU, React');
    expect(screen.getByLabelText('썸네일 이미지 URL')).toHaveValue(
      'https://i.imgur.com/a.png'
    );
  });

  it('splits #border off a saved thumbnail into the switch', async () => {
    useAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    fetchEditablePost.mockResolvedValue({
      id: 3,
      title: '숨긴 글',
      content: '본문',
      thumbnail: { url: 'https://i.imgur.com/a.png#border' },
      author: { id: 7, username: 'me', name: '나' },
    });
    renderAt('/posts/3/edit');

    expect(await screen.findByDisplayValue('숨긴 글')).toBeInTheDocument();
    expect(screen.getByLabelText('썸네일 이미지 URL')).toHaveValue(
      'https://i.imgur.com/a.png'
    );
    expect(
      screen.getByRole('checkbox', { name: '썸네일 테두리' })
    ).toBeChecked();
  });

  it("refuses to edit someone else's post", async () => {
    useAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    fetchEditablePost.mockResolvedValue({
      id: 3,
      title: '남의 글',
      author: { id: 8 },
    });
    renderAt('/posts/3/edit');

    expect(
      await screen.findByText('이 글을 수정할 권한이 없습니다.')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('제목')).not.toBeInTheDocument();
  });

  it('reports a missing post', async () => {
    useAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    fetchEditablePost.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'POST_NOT_FOUND' })
    );
    renderAt('/posts/3/edit');

    expect(
      await screen.findByText('글을 불러올 수 없습니다')
    ).toBeInTheDocument();
  });
});
