import { fetchPosts } from '@apis/postApi';
import { fetchUsersCursor } from '@apis/userApi';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

const SEARCH_PAGE_SIZE = 50;
// 백엔드 커서 버그로 무한 루프가 나더라도 여기서 멈추는 안전 상한
const MAX_PAGES = 20;

export async function fetchAllUsers() {
  const users = [];
  let cursor = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const { content, last } = await fetchUsersCursor({
      pageSize: SEARCH_PAGE_SIZE,
      lastId: cursor,
    });
    users.push(...content);
    const nextCursor =
      content.length > 0 ? content[content.length - 1]?.id : null;
    if (last || nextCursor == null || nextCursor === cursor) break;
    cursor = nextCursor;
  }
  // 백엔드가 커서를 무시하고 같은 페이지를 반환한 경우의 중복 제거
  const seen = new Set();
  return users.filter((user) => {
    const key = user.id ?? user.username;
    if (key == null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildEntries(users, posts) {
  // 라우트가 /:username 기반이므로 username 없는 유저는 이동할 곳이 없다.
  const userEntries = users
    .filter((user) => user.username)
    .map((user) => ({
      id: `user-${user.id ?? user.username}`,
      type: 'user',
      title: user.name || user.username,
      subtitle: `@${user.username}`,
      keywords: [user.bio || ''],
      image: user.profileImage?.url || '',
      action: { to: `/${user.username}` },
    }));

  const postEntries = posts
    .filter((post) => post.id != null)
    .map((post) => ({
      id: `post-${post.id}`,
      type: 'post',
      title: post.title || '',
      subtitle: post.subtitle || '',
      keywords: [],
      image: post.thumbnail?.url || '',
      action: { to: `/posts/${post.id}` },
    }));

  return [...userEntries, ...postEntries];
}

// 검색 팔레트가 처음 열릴 때 유저/포스트 전체를 받아 검색 엔트리로 변환한다.
// react-query 캐시에 남으므로 이후 열 때는 즉시 사용된다.
export default function useSearchIndex(enabled = true) {
  const usersQuery = useQuery({
    queryKey: ['search', 'users'],
    queryFn: fetchAllUsers,
    enabled,
    staleTime: 5 * 60_000,
  });

  const postsQuery = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    enabled,
    staleTime: 5 * 60_000,
  });

  const entries = useMemo(
    () => buildEntries(usersQuery.data ?? [], postsQuery.data ?? []),
    [usersQuery.data, postsQuery.data]
  );

  return {
    entries,
    loading: enabled && (usersQuery.isPending || postsQuery.isPending),
    error: usersQuery.isError || postsQuery.isError,
  };
}
