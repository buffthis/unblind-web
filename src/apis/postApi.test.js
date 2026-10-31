import client from '@apis/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchEditablePost,
  fetchPostById,
  fetchPosts,
  isExternalPost,
  savePost,
  toSaveError,
  uploadDataFile,
  uploadImage,
} from './postApi';

vi.mock('@apis/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const values = {
  title: '제목',
  subtitle: '',
  thumbnailUrl: '',
  content: '본문',
};

function httpError(status, data) {
  return Object.assign(new Error(`HTTP ${status}`), {
    response: { status, data },
  });
}

beforeEach(() => {
  client.get.mockReset();
  client.post.mockReset();
  client.patch.mockReset();
});

// Posts that only pointed to an outside blog are no longer shown anywhere.
describe('external posts', () => {
  it('drops them from the post list along with hidden posts', async () => {
    client.get.mockResolvedValue({
      data: [
        { id: 1, externalUrl: 'https://velog.io/@a/1' },
        { id: 2, externalUrl: null },
        { id: 3, externalUrl: '' },
        { id: 4, hidden: true },
      ],
    });
    expect((await fetchPosts()).map((post) => post.id)).toEqual([2, 3]);
  });

  it('treats one as not found when opened by its address', async () => {
    client.get.mockResolvedValue({
      data: { id: 1, content: '', externalUrl: 'https://velog.io/@a/1' },
    });
    await expect(fetchPostById(1)).rejects.toMatchObject({
      code: 'POST_NOT_FOUND',
    });
  });

  it('tells them apart by a non-empty externalUrl', () => {
    expect(isExternalPost({ externalUrl: 'https://a.b' })).toBe(true);
    expect(isExternalPost({ externalUrl: '' })).toBe(false);
    expect(isExternalPost({})).toBe(false);
  });
});

describe('fetchEditablePost', () => {
  it('returns hidden posts so owners can edit them', async () => {
    client.get.mockResolvedValue({ data: { id: 3, hidden: true } });
    await expect(fetchEditablePost('3')).resolves.toEqual({
      id: 3,
      hidden: true,
    });
  });

  it('throws POST_NOT_FOUND for an empty payload', async () => {
    client.get.mockResolvedValue({ data: '' });
    await expect(fetchEditablePost('3')).rejects.toMatchObject({
      code: 'POST_NOT_FOUND',
    });
  });
});

describe('savePost', () => {
  it('persists the toc setting and restores clean content on every read path', async () => {
    const stored = {
      id: 9,
      content: '<!-- unblind:toc-max-level=2 -->\n\n## 소개\n\n### 상세',
    };
    client.post.mockResolvedValue({ data: stored });
    const decoded = { id: 9, content: '## 소개\n\n### 상세', tocMaxLevel: 2 };
    await expect(
      savePost({
        postId: null,
        values: { ...values, content: decoded.content, tocMaxLevel: '2' },
        hidden: false,
      })
    ).resolves.toEqual(decoded);
    expect(client.post).toHaveBeenCalledWith(
      '/posts',
      expect.objectContaining({ content: stored.content })
    );

    client.get.mockResolvedValue({ data: stored });
    await expect(fetchPostById(9)).resolves.toEqual(decoded);
    await expect(fetchEditablePost(9)).resolves.toEqual(decoded);
    client.get.mockResolvedValue({ data: [stored] });
    await expect(fetchPosts()).resolves.toEqual([decoded]);

    client.patch.mockResolvedValue({
      data: { id: 9, content: decoded.content },
    });
    await savePost({
      postId: 9,
      values: { ...values, content: decoded.content, tocMaxLevel: 3 },
      hidden: false,
    });
    expect(client.patch).toHaveBeenCalledWith(
      '/posts/9',
      expect.objectContaining({ content: decoded.content })
    );
  });

  it('creates a public post without userId', async () => {
    client.post.mockResolvedValue({ data: { id: 9 } });

    await expect(
      savePost({ postId: null, values, hidden: false })
    ).resolves.toEqual({ id: 9 });
    expect(client.post).toHaveBeenCalledWith('/posts', {
      title: '제목',
      subtitle: '',
      content: '본문',
      hidden: false,
    });
    expect(client.patch).not.toHaveBeenCalled();
  });

  it('sends the tag line as a list of tags', async () => {
    client.post.mockResolvedValue({ data: { id: 9 } });

    await savePost({
      postId: null,
      values: { ...values, tags: '#GPU, Kubernetes, gpu' },
      hidden: false,
    });

    expect(client.post).toHaveBeenCalledWith('/posts', {
      title: '제목',
      subtitle: '',
      content: '본문',
      tags: ['GPU', 'Kubernetes'],
      hidden: false,
    });
  });

  it('clears tags when the tag line is emptied', async () => {
    client.patch.mockResolvedValue({ data: { id: 3 } });

    await savePost({
      postId: 3,
      values: { ...values, tags: '' },
      hidden: false,
    });

    expect(client.patch).toHaveBeenCalledWith(
      '/posts/3',
      expect.objectContaining({ tags: [] })
    );
  });

  it('creates a new hidden post in one request', async () => {
    client.post.mockResolvedValue({ data: { id: 9, hidden: true } });

    await savePost({ postId: null, values, hidden: true });

    expect(client.post).toHaveBeenCalledWith(
      '/posts',
      expect.objectContaining({ hidden: true })
    );
    expect(client.patch).not.toHaveBeenCalled();
  });

  it('patches an existing post with hidden in one request', async () => {
    client.patch.mockResolvedValue({ data: { id: 3 } });

    await savePost({ postId: 3, values, hidden: false });

    expect(client.post).not.toHaveBeenCalled();
    expect(client.patch).toHaveBeenCalledWith('/posts/3', {
      title: '제목',
      subtitle: '',
      content: '본문',
      hidden: false,
    });
  });

  it('registers a new thumbnail url as an image first', async () => {
    client.post
      .mockResolvedValueOnce({ data: { id: 50 } })
      .mockResolvedValueOnce({ data: { id: 9 } });

    await savePost({
      postId: null,
      values: { ...values, thumbnailUrl: 'https://i.imgur.com/a.png' },
      hidden: false,
    });

    expect(client.post).toHaveBeenNthCalledWith(1, '/images', {
      url: 'https://i.imgur.com/a.png',
      altText: '제목',
    });
    expect(client.post).toHaveBeenNthCalledWith(
      2,
      '/posts',
      expect.objectContaining({ thumbnailId: 50 })
    );
  });

  it('skips image registration when the thumbnail is unchanged', async () => {
    client.patch.mockResolvedValue({ data: { id: 3 } });

    await savePost({
      postId: 3,
      values: { ...values, thumbnailUrl: 'https://i.imgur.com/a.png' },
      hidden: false,
      initialThumbnailUrl: 'https://i.imgur.com/a.png',
    });

    expect(client.post).not.toHaveBeenCalled();
  });
});

describe('uploadImage', () => {
  it('posts the file as multipart form data to /images/uploads', async () => {
    client.post.mockResolvedValue({
      data: { id: 3, url: 'https://img/a.png' },
    });
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    expect(await uploadImage(file)).toEqual({
      id: 3,
      url: 'https://img/a.png',
    });
    const [path, body, config] = client.post.mock.calls[0];
    expect(path).toBe('/images/uploads');
    expect(body.get('file')).toBe(file);
    expect(config).toEqual({ timeout: 60000 });
  });
});

describe('uploadDataFile', () => {
  it('posts the file as multipart form data to /data-files and returns its address', async () => {
    client.post.mockResolvedValue({
      data: { url: 'https://bucket.test/data/2026/10/a.json' },
    });
    const file = new File(['{}'], 'a.json', { type: 'application/json' });

    expect(await uploadDataFile(file)).toEqual({
      url: 'https://bucket.test/data/2026/10/a.json',
    });
    const [path, body, config] = client.post.mock.calls[0];
    expect(path).toBe('/data-files');
    expect(body.get('file')).toBe(file);
    // A file takes longer to send than a request, so the default 10 seconds is too few.
    expect(config).toEqual({ timeout: 60000 });
  });
});

describe('toSaveError', () => {
  it('maps 400 field errors', () => {
    expect(
      toSaveError(httpError(400, { errors: { title: 'must not be blank' } }))
    ).toEqual({
      kind: 'validation',
      fieldErrors: { title: 'must not be blank' },
    });
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [500, 'unknown'],
  ])('maps %i to %s', (status, kind) => {
    expect(toSaveError(httpError(status, {})).kind).toBe(kind);
  });

  it('maps a missing response to network', () => {
    expect(toSaveError(new Error('Network Error')).kind).toBe('network');
  });
});
