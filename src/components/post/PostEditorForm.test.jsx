import { savePost } from '@apis/postApi';
import theme from '@styles/theme/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostEditorForm from './PostEditorForm';

vi.mock('@apis/postApi', async (importOriginal) => ({
  ...(await importOriginal()),
  savePost: vi.fn(),
}));

const empty = { title: '', subtitle: '', thumbnailUrl: '', content: '' };

function httpError(status, data) {
  return Object.assign(new Error(`HTTP ${status}`), {
    response: { status, data },
  });
}

function renderForm(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/posts/new']}>
          <Routes>
            <Route
              path="/posts/new"
              element={
                <PostEditorForm
                  postId={null}
                  initialValues={empty}
                  draftStorageKey="post-draft:new"
                  {...props}
                />
              }
            />
            <Route path="/posts/:postId" element={<p>상세 페이지</p>} />
            <Route path="/posts/:postId/edit" element={<p>수정 페이지</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function type(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  savePost.mockReset();
  localStorage.clear();
});

describe('PostEditorForm', () => {
  it('blocks publishing without a title or body', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '발행' }));

    expect(screen.getByText('제목을 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('본문을 입력해 주세요.')).toBeInTheDocument();
    expect(savePost).not.toHaveBeenCalled();
  });

  it('rejects a non-http thumbnail url', () => {
    renderForm();
    type('제목', '제목');
    type('본문', '본문');
    type('썸네일 이미지 URL', 'javascript:alert(1)');
    fireEvent.click(screen.getByRole('button', { name: '발행' }));

    expect(
      screen.getByText('http 또는 https 주소를 입력해 주세요.')
    ).toBeInTheDocument();
    expect(savePost).not.toHaveBeenCalled();
  });

  it('publishes, clears the draft and opens the post', async () => {
    savePost.mockResolvedValue({ id: 7 });
    renderForm();
    type('제목', '제목');
    type('본문', '## 소개');
    fireEvent.click(screen.getByRole('button', { name: '발행' }));

    expect(await screen.findByText('상세 페이지')).toBeInTheDocument();
    expect(savePost).toHaveBeenCalledWith({
      postId: null,
      values: {
        title: '제목',
        subtitle: '',
        thumbnailUrl: '',
        content: '## 소개',
      },
      hidden: false,
      initialThumbnailUrl: undefined,
    });
    expect(localStorage.getItem('post-draft:new')).toBeNull();
  });

  it('saves the draft before sending, so a 401 redirect loses nothing', async () => {
    savePost.mockImplementation(async () => {
      expect(JSON.parse(localStorage.getItem('post-draft:new'))).toMatchObject({
        title: '제목',
      });
      throw httpError(401, {});
    });
    renderForm();
    type('제목', '제목');
    type('본문', '본문');
    fireEvent.click(screen.getByRole('button', { name: '발행' }));

    expect(
      await screen.findByText(/로그인이 만료되었습니다/)
    ).toBeInTheDocument();
    expect(localStorage.getItem('post-draft:new')).not.toBeNull();
  });

  it('shows server field errors', async () => {
    savePost.mockRejectedValue(
      httpError(400, { errors: { title: '제목이 너무 깁니다' } })
    );
    renderForm();
    type('제목', '제목');
    type('본문', '본문');
    fireEvent.click(screen.getByRole('button', { name: '발행' }));

    expect(await screen.findByText('제목이 너무 깁니다')).toBeInTheDocument();
  });

  it('shows an image registration error under the thumbnail field', async () => {
    savePost.mockRejectedValue(
      httpError(400, { errors: { url: '잘못된 주소' } })
    );
    renderForm();
    type('제목', '제목');
    type('본문', '본문');
    type('썸네일 이미지 URL', 'https://i.imgur.com/a.png');
    fireEvent.click(screen.getByRole('button', { name: '발행' }));

    const thumbnailField = screen
      .getByPlaceholderText('https://')
      .closest('label');
    expect(
      await within(thumbnailField).findByText('잘못된 주소')
    ).toBeInTheDocument();
  });

  it('edits the already created post on retry after hiding failed', async () => {
    savePost
      .mockRejectedValueOnce(
        Object.assign(httpError(500, {}), { createdPost: { id: 9 } })
      )
      .mockResolvedValueOnce({ id: 9, hidden: true });
    renderForm();
    type('제목', '제목');
    type('본문', '본문');

    fireEvent.click(screen.getByRole('button', { name: '숨김으로 저장' }));
    expect(
      await screen.findByText(/숨김 처리에 실패했습니다/)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '숨김으로 저장' }));
    await waitFor(() => expect(savePost).toHaveBeenCalledTimes(2));
    expect(savePost.mock.calls[1][0]).toMatchObject({
      postId: 9,
      hidden: true,
    });
  });

  it('does not register the thumbnail twice when the retry follows a partial hide failure', async () => {
    savePost
      .mockRejectedValueOnce(
        Object.assign(httpError(500, {}), {
          createdPost: {
            id: 9,
            thumbnail: { url: 'https://i.imgur.com/a.png' },
          },
        })
      )
      .mockResolvedValueOnce({ id: 9, hidden: true });
    renderForm();
    type('제목', '제목');
    type('본문', '본문');
    type('썸네일 이미지 URL', 'https://i.imgur.com/a.png');

    fireEvent.click(screen.getByRole('button', { name: '숨김으로 저장' }));
    expect(
      await screen.findByText(/숨김 처리에 실패했습니다/)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '숨김으로 저장' }));
    await waitFor(() => expect(savePost).toHaveBeenCalledTimes(2));
    expect(savePost.mock.calls[1][0]).toMatchObject({
      postId: 9,
      initialThumbnailUrl: 'https://i.imgur.com/a.png',
    });
  });

  it('offers to restore an existing draft and does not overwrite it meanwhile', async () => {
    localStorage.setItem(
      'post-draft:new',
      JSON.stringify({
        ...empty,
        title: '옛 초안',
        savedAt: '2026-10-11T05:00:00.000Z',
      })
    );
    renderForm();

    expect(screen.getByText(/임시 저장된 글이 있습니다/)).toBeInTheDocument();
    type('부제목', '아직 결정 전');
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(JSON.parse(localStorage.getItem('post-draft:new')).title).toBe(
      '옛 초안'
    );

    fireEvent.click(screen.getByRole('button', { name: '불러오기' }));
    expect(screen.getByLabelText('제목')).toHaveValue('옛 초안');
  });

  it('keeps both save buttons disabled until a stored draft is resolved', () => {
    localStorage.setItem(
      'post-draft:new',
      JSON.stringify({ ...empty, title: '옛 초안' })
    );
    renderForm();
    type('제목', '제목');
    type('본문', '본문');

    expect(
      screen.getByText(
        '임시 저장된 글을 불러오거나 버린 뒤 저장할 수 있습니다.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '발행' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '숨김으로 저장' })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '발행' }));
    expect(savePost).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '버리기' }));

    expect(screen.getByRole('button', { name: '발행' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '숨김으로 저장' })).toBeEnabled();
  });

  it('tracks the saved thumbnail so a later save does not register it again', async () => {
    savePost
      .mockResolvedValueOnce({
        id: 3,
        thumbnail: { url: 'https://i.imgur.com/b.png' },
      })
      .mockResolvedValueOnce({ id: 3 });
    const queryClient = new QueryClient();
    render(
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/posts/3/edit']}>
            <Routes>
              <Route
                path="/posts/:postId/edit"
                element={
                  <PostEditorForm
                    postId={3}
                    initialValues={{
                      ...empty,
                      title: '제목',
                      content: '본문',
                      thumbnailUrl: 'https://i.imgur.com/a.png',
                    }}
                    initialThumbnailUrl="https://i.imgur.com/a.png"
                    draftStorageKey="post-draft:3"
                  />
                }
              />
              <Route path="/posts/:postId" element={<p>상세 페이지</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
    type('썸네일 이미지 URL', 'https://i.imgur.com/b.png');

    fireEvent.click(screen.getByRole('button', { name: '숨김으로 저장' }));
    await waitFor(() => expect(savePost).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '발행' })).toBeEnabled()
    );

    fireEvent.click(screen.getByRole('button', { name: '발행' }));
    await waitFor(() => expect(savePost).toHaveBeenCalledTimes(2));
    expect(savePost.mock.calls[1][0]).toMatchObject({
      initialThumbnailUrl: 'https://i.imgur.com/b.png',
    });
  });

  it('discards an existing draft on request', () => {
    localStorage.setItem(
      'post-draft:new',
      JSON.stringify({ ...empty, title: '옛 초안' })
    );
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: '버리기' }));

    expect(localStorage.getItem('post-draft:new')).toBeNull();
    expect(
      screen.queryByText(/임시 저장된 글이 있습니다/)
    ).not.toBeInTheDocument();
  });

  it('wraps the selection in bold from the toolbar', () => {
    renderForm();
    const body = screen.getByLabelText('본문');
    fireEvent.change(body, { target: { value: 'a word b' } });
    body.setSelectionRange(2, 6);

    fireEvent.click(screen.getByRole('button', { name: '굵게' }));

    expect(body).toHaveValue('a **word** b');
  });

  it('renders the preview with the shared article renderer', async () => {
    renderForm();
    type('본문', '## 소개');

    expect(
      await screen.findByRole('heading', { level: 2, name: /소개/ })
    ).toHaveAttribute('id', '소개');
  });
});
