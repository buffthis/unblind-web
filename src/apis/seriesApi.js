import client from '@apis/client';
import { ENDPOINTS } from '@apis/endpoints';

// Keep the server's reading order. Private entries must also be excluded by the
// public API; this filter is a display safeguard, not an authorization boundary.
export function publicSeriesPosts(posts = []) {
  return posts.filter(
    (post) => post?.id != null && !post.hidden && !post.externalUrl
  );
}

export async function fetchSeries(seriesId, { editable = false } = {}) {
  const { data } = await client.get(
    editable
      ? ENDPOINTS.SERIES.EDIT(seriesId)
      : ENDPOINTS.SERIES.BY_ID(seriesId)
  );
  if (data?.id == null || !Array.isArray(data.posts)) {
    throw new Error('시리즈를 불러오지 못했습니다.');
  }
  return {
    ...data,
    posts: editable ? data.posts : publicSeriesPosts(data.posts),
  };
}

export async function fetchUserSeries(userId) {
  const { data } = await client.get(ENDPOINTS.SERIES.BY_AUTHOR(userId));
  if (!Array.isArray(data))
    throw new Error('시리즈 목록을 불러오지 못했습니다.');
  return data.filter((series) => series?.id != null && series.postCount > 0);
}

export async function fetchMySeries() {
  const { data } = await client.get(ENDPOINTS.SERIES.MINE);
  if (!Array.isArray(data))
    throw new Error('시리즈 목록을 불러오지 못했습니다.');
  return data;
}

export async function saveSeries({ seriesId, values }) {
  const body = {
    title: values.title.trim(),
    description: values.description.trim(),
    color: values.color,
    postIds: values.posts.map((post) => post.id),
    ...(seriesId != null && { version: values.version }),
  };
  const { data } =
    seriesId == null
      ? await client.post(ENDPOINTS.SERIES.LIST, body)
      : await client.patch(ENDPOINTS.SERIES.BY_ID(seriesId), body);
  if (data?.id == null) throw new Error('저장 결과를 확인하지 못했습니다.');
  return data;
}

export async function fetchSeriesCandidatePosts(userId) {
  const { data } = await client.get(ENDPOINTS.POSTS.LIST, {
    params: { userId, includeHidden: true },
  });
  if (!Array.isArray(data)) throw new Error('글 목록을 불러오지 못했습니다.');
  return data.filter(
    (post) => !post.externalUrl && String(post.author?.id) === String(userId)
  );
}

export async function deleteSeries(seriesId) {
  await client.delete(ENDPOINTS.SERIES.BY_ID(seriesId));
}
