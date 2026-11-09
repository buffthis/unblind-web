import client from '@apis/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchMySeries,
  fetchSeries,
  fetchUserSeries,
  saveSeries,
} from './seriesApi';

vi.mock('@apis/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());

describe('series API', () => {
  it('keeps reading order while removing non-public entries from the reader response', async () => {
    client.get.mockResolvedValue({
      data: {
        id: 1,
        posts: [
          { id: 3 },
          { id: 8, hidden: true },
          { id: 5, externalUrl: 'https://a.test' },
          { id: 2 },
        ],
      },
    });
    expect((await fetchSeries(1)).posts.map((post) => post.id)).toEqual([3, 2]);
  });
  it('loads hidden entries only from the authenticated editing endpoint', async () => {
    client.get.mockResolvedValue({
      data: { id: 1, posts: [{ id: 3, hidden: true }] },
    });
    expect((await fetchSeries(1, { editable: true })).posts).toHaveLength(1);
    expect(client.get).toHaveBeenCalledWith('/series/1/edit');
  });
  it('does not disguise an invalid server payload as an empty list', async () => {
    client.get.mockResolvedValue({ data: '<html>Not Found</html>' });
    await expect(fetchMySeries()).rejects.toThrow();
    await expect(fetchSeries(1)).rejects.toThrow();
  });
  it('hides empty series from public profiles', async () => {
    client.get.mockResolvedValue({
      data: [
        { id: 1, postCount: 0 },
        { id: 2, postCount: 3 },
      ],
    });
    expect(await fetchUserSeries(7)).toEqual([{ id: 2, postCount: 3 }]);
  });
  it('saves metadata and reading order in one versioned request', async () => {
    client.patch.mockResolvedValue({ data: { id: 1 } });
    await saveSeries({
      seriesId: 1,
      values: {
        title: ' 제목 ',
        description: ' 소개 ',
        color: 'sage',
        version: 4,
        posts: [{ id: 5 }, { id: 2 }],
      },
    });
    expect(client.patch).toHaveBeenCalledWith('/series/1', {
      title: '제목',
      description: '소개',
      color: 'sage',
      version: 4,
      postIds: [5, 2],
    });
  });
});
