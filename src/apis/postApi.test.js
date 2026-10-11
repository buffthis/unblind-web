import client from '@apis/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchEditablePost, savePost, toSaveError } from './postApi';

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
  it('creates a public post without userId', async () => {
    client.post.mockResolvedValue({ data: { id: 9 } });

    await expect(
      savePost({ postId: null, values, hidden: false })
    ).resolves.toEqual({ id: 9 });
    expect(client.post).toHaveBeenCalledWith('/posts', {
      title: '제목',
      subtitle: '',
      content: '본문',
    });
    expect(client.patch).not.toHaveBeenCalled();
  });

  it('creates then hides a new hidden post', async () => {
    client.post.mockResolvedValue({ data: { id: 9 } });
    client.patch.mockResolvedValue({ data: { id: 9, hidden: true } });

    await savePost({ postId: null, values, hidden: true });

    expect(client.patch).toHaveBeenCalledWith('/posts/9', { hidden: true });
  });

  it('attaches the created post when hiding fails', async () => {
    client.post.mockResolvedValue({ data: { id: 9 } });
    client.patch.mockRejectedValue(httpError(500, {}));

    await expect(
      savePost({ postId: null, values, hidden: true })
    ).rejects.toMatchObject({
      createdPost: { id: 9 },
    });
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
