import client from '@apis/client';
import { ENDPOINTS } from '@apis/endpoints';
import { parseTags } from '@utils/tags';

// Posts that only linked out to another blog have no body here and are no longer
// shown: lists drop them and their address answers as not found.
export function isExternalPost(post) {
  return Boolean(post.externalUrl);
}

export async function fetchPostById(postId) {
  const response = await client.get(ENDPOINTS.POSTS.BY_ID(postId));
  const post = response.data;
  // 백엔드가 존재하지 않는 id에 404 대신 200 + 빈 본문을 반환하므로
  // 페이로드 자체를 검증해 "없음"을 판정한다. hidden 포스트도 목록에서만
  // 숨기면 URL 직접 접근으로 우회되므로 여기서 함께 차단한다.
  if (
    !post ||
    typeof post !== 'object' ||
    post.id == null ||
    post.hidden ||
    isExternalPost(post)
  ) {
    const error = new Error(`Post not found: ${postId}`);
    error.code = 'POST_NOT_FOUND';
    throw error;
  }
  return post;
}

export async function fetchPosts() {
  const response = await client.get(ENDPOINTS.POSTS.LIST);
  const posts = Array.isArray(response.data) ? response.data : [];
  return posts.filter((post) => !post.hidden && !isExternalPost(post));
}

function notFound(postId) {
  const error = new Error(`Post not found: ${postId}`);
  error.code = 'POST_NOT_FOUND';
  return error;
}

// Unlike fetchPostById, hidden posts pass through: the backend only returns them to their owner.
export async function fetchEditablePost(postId) {
  const response = await client.get(ENDPOINTS.POSTS.BY_ID(postId));
  const post = response.data;
  if (!post || typeof post !== 'object' || post.id == null)
    throw notFound(postId);
  return post;
}

async function registerThumbnail(values, initialThumbnailUrl) {
  if (!values.thumbnailUrl || values.thumbnailUrl === initialThumbnailUrl)
    return null;
  const response = await client.post(ENDPOINTS.IMAGES, {
    url: values.thumbnailUrl,
    altText: values.title,
  });
  return response.data.id;
}

// Sends the file itself; the response has the same shape as a registered image URL.
export async function uploadImage(file) {
  const body = new FormData();
  body.append('file', file);
  const response = await client.post(ENDPOINTS.IMAGE_UPLOAD, body);
  return response.data;
}

export async function savePost({
  postId,
  values,
  hidden,
  initialThumbnailUrl,
}) {
  const thumbnailId = await registerThumbnail(values, initialThumbnailUrl);
  const body = {
    title: values.title,
    subtitle: values.subtitle,
    content: values.content,
    ...(values.tags != null && { tags: parseTags(values.tags) }),
    ...(thumbnailId != null && { thumbnailId }),
    hidden,
  };

  const response =
    postId != null
      ? await client.patch(ENDPOINTS.POSTS.BY_ID(postId), body)
      : await client.post(ENDPOINTS.POSTS.LIST, body);
  return response.data;
}

const KIND_BY_STATUS = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
};

export function toSaveError(error) {
  const response = error?.response;
  if (!response) return { kind: 'network', fieldErrors: {} };
  if (response.status === 400) {
    const errors = response.data?.errors;
    return {
      kind: 'validation',
      fieldErrors: errors && typeof errors === 'object' ? errors : {},
    };
  }
  return {
    kind: KIND_BY_STATUS[response.status] ?? 'unknown',
    fieldErrors: {},
  };
}
