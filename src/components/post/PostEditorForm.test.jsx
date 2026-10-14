import { savePost, uploadImage } from '@apis/postApi';
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
  uploadImage: vi.fn(),
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
  uploadImage.mockReset();
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

  it('keeps the error color and the title weight against the Field rules', () => {
    const { container } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: '발행' }));

    expect(
      getComputedStyle(screen.getByText('제목을 입력해 주세요.')).color
    ).toBe('rgb(217, 48, 37)');
    expect(getComputedStyle(container.querySelector('input')).fontWeight).toBe(
      '700'
    );
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

  it('rejects a relative thumbnail url', () => {
    renderForm();
    type('제목', '제목');
    type('본문', '본문');
    type('썸네일 이미지 URL', 'a.png');
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

  it('does not report a failure when only clearing the draft fails after a successful save', async () => {
    const removeItem = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementationOnce(() => {
        throw new DOMException('denied', 'SecurityError');
      });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      savePost.mockResolvedValue({ id: 9 });
      renderForm();
      type('제목', '제목');
      type('본문', '본문');
      fireEvent.click(screen.getByRole('button', { name: '발행' }));

      expect(await screen.findByText('상세 페이지')).toBeInTheDocument();
      expect(screen.queryByText(/저장하지 못했습니다/)).not.toBeInTheDocument();
      expect(savePost).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      removeItem.mockRestore();
      consoleError.mockRestore();
    }
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

  it('blocks publishing with more tags than the server accepts', () => {
    renderForm();
    type('제목', '제목');
    type('본문', '본문');
    type('태그', Array.from({ length: 11 }, (_, i) => `t${i}`).join(', '));
    fireEvent.click(screen.getByRole('button', { name: '발행' }));

    const tagField = screen
      .getByPlaceholderText(/쉼표로 구분/)
      .closest('label');
    expect(
      within(tagField).getByText('태그는 10개까지 쓸 수 있습니다(지금 11개).')
    ).toBeInTheDocument();
    expect(savePost).not.toHaveBeenCalled();
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

  describe('image uploads', () => {
    const png = new File(['x'], 'shot.png', { type: 'image/png' });
    const body = () => screen.getByLabelText('본문');

    it('replaces the marker with the uploaded image markdown', async () => {
      let finish;
      uploadImage.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      renderForm();
      type('본문', '앞 뒤');

      fireEvent.paste(body(), { clipboardData: { files: [png] } });
      expect(body()).toHaveValue('앞 뒤![shot 업로드 중 #1]()');

      finish({ url: 'https://img/shot.png', altText: '' });
      await waitFor(() =>
        expect(body()).toHaveValue('앞 뒤![shot](https://img/shot.png)')
      );
      expect(uploadImage).toHaveBeenCalledWith(png);
    });

    it('uploads files dropped on the body', async () => {
      uploadImage.mockResolvedValue({ url: 'https://img/d.png', altText: 'd' });
      renderForm();

      fireEvent.drop(body(), { dataTransfer: { files: [png] } });

      await waitFor(() =>
        expect(body()).toHaveValue('![d](https://img/d.png)')
      );
    });

    it('uploads files chosen with the button', async () => {
      uploadImage.mockResolvedValue({ url: 'https://img/p.png', altText: '' });
      renderForm();

      fireEvent.change(screen.getByTestId('image-file-input'), {
        target: { files: [png] },
      });

      await waitFor(() =>
        expect(body()).toHaveValue('![shot](https://img/p.png)')
      );
    });

    it('ignores pasted text and non-image files', () => {
      renderForm();
      const text = new File(['x'], 'a.txt', { type: 'text/plain' });

      fireEvent.paste(body(), { clipboardData: { files: [text] } });

      expect(uploadImage).not.toHaveBeenCalled();
    });

    it('removes the marker and reports a failed upload', async () => {
      uploadImage.mockRejectedValue(httpError(500, {}));
      renderForm();
      type('본문', '글');

      fireEvent.paste(body(), { clipboardData: { files: [png] } });

      expect(await screen.findByRole('status')).toHaveTextContent(
        '이미지를 올리지 못했습니다: shot.png'
      );
      expect(body()).toHaveValue('글');
    });

    it('shows why the server refused the file', async () => {
      uploadImage.mockRejectedValue(
        httpError(400, {
          errors: { file: '이미지는 5MB까지 올릴 수 있습니다' },
        })
      );
      renderForm();

      fireEvent.paste(body(), { clipboardData: { files: [png] } });

      expect(await screen.findByRole('status')).toHaveTextContent(
        '이미지를 올리지 못했습니다: shot.png. 이미지는 5MB까지 올릴 수 있습니다'
      );
    });

    it('refuses to save while an upload is running', () => {
      uploadImage.mockReturnValue(new Promise(() => {}));
      renderForm();
      type('제목', '제목');
      type('본문', '본문');

      fireEvent.paste(body(), { clipboardData: { files: [png] } });
      fireEvent.click(screen.getByRole('button', { name: '발행' }));

      expect(savePost).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent(
        '이미지를 올리는 중입니다'
      );
    });
  });
});
