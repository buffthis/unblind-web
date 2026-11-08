import { fetchPostById } from '@apis/postApi';
import theme from '@styles/theme/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostArticle from './PostArticle';

vi.mock('@apis/postApi', () => ({ fetchPostById: vi.fn() }));

const post = {
  id: 12,
  title: '캐시를 이해하는 방법',
  subtitle: '실제 동작으로 살펴봅니다.',
  author: { name: '홍길동' },
  createdAt: '2026-11-08T00:00:00',
  thumbnail: { url: 'https://example.com/thumb.png#border' },
};

function renderCard(content = '```post\n/posts/12\n```', cached) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (cached) client.setQueryData(['post', '12'], cached);
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PostArticle content={content} />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  fetchPostById.mockReset();
});

describe('post cards in markdown', () => {
  it('renders the linked post and hides a broken thumbnail', async () => {
    fetchPostById.mockResolvedValue(post);
    const { container } = renderCard();
    expect(
      await screen.findByRole('link', { name: /캐시를 이해하는 방법/ })
    ).toHaveAttribute('href', '/posts/12');
    expect(screen.getByText('실제 동작으로 살펴봅니다.')).toBeInTheDocument();
    expect(screen.getByText('홍길동 · 2026.11.08')).toBeInTheDocument();
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://example.com/thumb.png');
    fireEvent.error(image);
    expect(container.querySelector('img')).toBeNull();
  });
  it('renders a text-only card without an image', async () => {
    fetchPostById.mockResolvedValue({ ...post, thumbnail: null });
    const { container } = renderCard();
    await screen.findByRole('link', { name: /캐시를 이해하는 방법/ });
    expect(container.querySelector('img')).toBeNull();
  });
  it('does not fetch invalid or external card addresses', () => {
    renderCard('```post\nhttps://evil.test/posts/12\n```');
    expect(screen.getByText(/글 카드 주소를 확인/)).toBeInTheDocument();
    expect(fetchPostById).not.toHaveBeenCalled();
  });
  it('removes stale cached metadata when the post is unavailable', async () => {
    fetchPostById.mockRejectedValue(
      Object.assign(new Error('missing'), { response: { status: 404 } })
    );
    renderCard(undefined, post);
    await waitFor(() =>
      expect(screen.getByText('볼 수 없는 글입니다.')).toBeInTheDocument()
    );
    expect(screen.queryByText(post.title)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('can retry a network failure', async () => {
    fetchPostById
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(post);
    renderCard();
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    await screen.findByRole('link', { name: /캐시를 이해하는 방법/ });
    await waitFor(() => expect(fetchPostById).toHaveBeenCalledTimes(2));
  });
  it('keeps ordinary markdown links inline', () => {
    renderCard('문장 속 [참고 글](/posts/12)입니다.');
    expect(
      screen.getByRole('link', { name: '참고 글' }).closest('p')
    ).not.toBeNull();
    expect(fetchPostById).not.toHaveBeenCalled();
  });
});
