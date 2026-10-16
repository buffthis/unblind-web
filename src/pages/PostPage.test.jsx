import { useAuth } from '@contexts/AuthContext';
import usePost from '@hooks/usePost';
import useUser from '@hooks/useUser';
import theme from '@styles/theme/theme';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostPage from './PostPage';

vi.mock('@components/header/BasicHeader', () => ({ default: () => null }));
vi.mock('@components/common/Footer', () => ({ default: () => null }));
vi.mock('@hooks/usePost', () => ({ default: vi.fn() }));
vi.mock('@hooks/useUser', () => ({ default: vi.fn() }));
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

// What useUser returns for the author: a profile with no photo and no careers.
const profile = (user = {}) => ({
  user: { profileImage: { url: '' }, careers: [], ...user },
  loading: false,
  error: false,
});

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
  useUser.mockReset().mockReturnValue(profile());
  useAuth.mockReturnValue({ user: null, loading: false });
});

describe('PostPage', () => {
  it('puts the author profile photo to the left of the name and date', () => {
    useUser.mockReturnValue(
      profile({ profileImage: { url: 'https://example.com/me.png' } })
    );
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    const { container } = renderPage();

    expect(useUser).toHaveBeenCalledWith('hyeongjun');
    const photo = container.querySelector('header img');
    expect(photo).toHaveAttribute('src', 'https://example.com/me.png');
    expect(photo).toHaveAttribute('alt', '');
    expect(photo).toHaveAttribute('width', '33');
    const name = within(container.querySelector('header')).getByRole('link', {
      name: '형준',
    });
    expect(
      photo.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows the job under the name and the date at the right end of the row', () => {
    useUser.mockReturnValue(
      profile({
        careers: [
          { endDate: '2024-06-28', position: '옛 직무' },
          { endDate: null, position: '백엔드 개발자' },
        ],
      })
    );
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    const { container } = renderPage();

    const header = within(container.querySelector('header'));
    const name = header.getByRole('link', { name: '형준' });
    const job = header.getByText('백엔드 개발자');
    const date = header.getByText('2026.10.01');
    expect(name.parentElement.contains(job)).toBe(true);
    expect(header.queryByText('옛 직무')).toBeNull();
    expect(name.parentElement.contains(date)).toBe(false);
    expect(
      name.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows only the name on the left when the author has no current job', () => {
    useUser.mockReturnValue(
      profile({
        careers: [
          { endDate: '2024-06-28', position: '옛 직무' },
          { endDate: null, position: '' },
        ],
      })
    );
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    const { container } = renderPage();

    const header = within(container.querySelector('header'));
    const name = header.getByRole('link', { name: '형준' });
    expect(name.parentElement.textContent).toBe('형준');
    expect(header.getByText('2026.10.01')).toBeInTheDocument();
  });

  it('puts the date just before the edit button for the owner', () => {
    useAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    const { container } = renderPage();

    const header = within(container.querySelector('header'));
    const date = header.getByText('2026.10.01');
    const edit = header.getByRole('link', { name: '수정' });
    expect(date.parentElement).toBe(edit.parentElement);
    expect(
      date.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows the default avatar while the author has no profile photo', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    const { container } = renderPage();

    expect(container.querySelector('header img')).toBeNull();
    expect(container.querySelector('header svg')).not.toBeNull();
  });

  it('shows no avatar when the post has no author', () => {
    usePost.mockReturnValue({
      post: { ...basePost, author: null },
      loading: false,
      error: false,
    });
    const { container } = renderPage();

    expect(useUser).toHaveBeenCalledWith(undefined);
    expect(container.querySelector('header img, header svg')).toBeNull();
  });

  it('draws the thumbnail without #border and with a border when it carries it', () => {
    usePost.mockReturnValue({
      post: {
        ...basePost,
        thumbnail: {
          url: 'https://i.imgur.com/a.png#border',
          altText: '썸네일',
        },
      },
      loading: false,
      error: false,
    });
    renderPage();

    const thumbnail = screen.getByAltText('썸네일');
    expect(thumbnail).toHaveAttribute('src', 'https://i.imgur.com/a.png');
    expect(thumbnail).toHaveAttribute('data-border');
  });

  it('draws a plain thumbnail without a border', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    expect(screen.getByAltText('썸네일')).not.toHaveAttribute('data-border');
  });

  it('draws the thumbnail as a block, so no baseline gap opens under it', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    // An inline image sits on the text baseline and leaves about 8px of descender
    // space below, which the margin under the thumbnail then comes on top of.
    expect(screen.getByAltText('썸네일')).toHaveStyle({ display: 'block' });
  });

  it('gives the thumbnail 4.5px below it, as an image in the article has, and 20px above the article', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    // The thumbnail has no empty space of its own below it, so it carries the 4.5px a
    // line of text keeps inside its box, and the article adds the usual 20px gap. The
    // page is a column, so the two add up and the first title is 29px away.
    const thumbnail = screen.getByAltText('썸네일');
    expect(thumbnail).toHaveStyle({ marginBottom: '4.5px' });
    expect(thumbnail.nextElementSibling).toHaveStyle({ marginTop: '20px' });
    expect(thumbnail.parentElement).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
    });
  });

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

  it('shows author and date in the meta row without a reading time', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    expect(screen.getAllByRole('link', { name: '형준' })[0]).toHaveAttribute(
      'href',
      '/hyeongjun'
    );
    expect(screen.getByText('2026.10.01')).toBeInTheDocument();
    expect(screen.queryByText(/분 읽기/)).not.toBeInTheDocument();
  });

  it('lists the tags under the title without a # prefix', () => {
    usePost.mockReturnValue({
      post: { ...basePost, tags: ['GPU', 'Kubernetes'] },
      loading: false,
      error: false,
    });
    renderPage();

    const list = screen.getByRole('list', { name: '태그' });
    expect(list).toHaveTextContent(/^GPUKubernetes$/);
    const title = screen.getByRole('heading', { level: 1, name: '글 제목' });
    expect(
      title.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows no tag list when the post has no tags', () => {
    usePost.mockReturnValue({
      post: { ...basePost, tags: [] },
      loading: false,
      error: false,
    });
    renderPage();

    expect(
      screen.queryByRole('list', { name: '태그' })
    ).not.toBeInTheDocument();
  });

  it('builds the table of contents from the rendered article', async () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    // The aside is display:none until the toc fits beside the article, and jsdom ignores media queries,
    // so the query has to include hidden elements.
    expect(
      await screen.findByRole('navigation', { name: '목차', hidden: true })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '소개', hidden: true })
    ).toBeInTheDocument();
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

  describe('entrance', () => {
    afterEach(() => window.history.replaceState(null, '', '/'));

    const entranceOn = (hash) => {
      window.history.replaceState(null, '', `/posts/3${hash}`);
      usePost.mockReturnValue({ post: basePost, loading: false, error: false });
      const { container } = renderPage();
      return container.querySelector('[data-entrance]') != null;
    };

    it('plays when the page opens at the top', () => {
      expect(entranceOn('')).toBe(true);
    });

    it('is skipped when the #hash lands on a heading', () => {
      expect(entranceOn(`#${encodeURIComponent('소개')}`)).toBe(false);
    });

    it('plays when the #hash matches no heading', () => {
      expect(entranceOn('#renamed-section')).toBe(true);
    });
  });

  it('hides the edit link from anonymous visitors', () => {
    usePost.mockReturnValue({ post: basePost, loading: false, error: false });
    renderPage();

    expect(
      screen.queryByRole('link', { name: '수정' })
    ).not.toBeInTheDocument();
  });
});
