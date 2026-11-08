import { fetchPostById, fetchPosts } from '@apis/postApi';
import { useQuery } from '@tanstack/react-query';
import { parsePostLink } from '@utils/postLink';
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { PostLinkCard } from './PostLinkCard';

const Dialog = styled.dialog`
  width: min(550px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.ink};
  background: ${({ theme }) => theme.colors.background};
  &::backdrop {
    background: rgba(0, 0, 0, 0.35);
  }
  h2 {
    font-size: 18px;
    margin: 0 0 12px;
  }
  label {
    display: block;
    font-size: 13px;
    margin-bottom: 8px;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    font: inherit;
    font-size: 14px;
  }
  input:focus-visible,
  button:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`;
const Hint = styled.p`
  margin: 10px 0;
  color: ${({ theme }) => theme.colors.secondary};
  font-size: 13px;
  line-height: 20px;
`;
const Results = styled.ul`
  padding: 0;
  margin: 16px 0;
  max-height: 220px;
  overflow-y: auto;
  list-style: none;
`;
const Result = styled.button`
  width: 100%;
  padding: 12px 8px;
  text-align: left;
  overflow-wrap: anywhere;
  font: inherit;
  font-size: 14px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: inherit;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.inkSurface};
  }
  span {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
  }
`;
const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
`;
const Button = styled.button`
  padding: 8px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  background: ${({ $primary, theme }) =>
    $primary ? theme.colors.inkStrong : theme.colors.background};
  color: ${({ $primary, theme }) =>
    $primary ? theme.colors.background : theme.colors.ink};
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export default function PostLinkDialog({ currentPostId, onInsert, onClose }) {
  const ref = useRef(null);
  const [input, setInput] = useState('');
  const target = parsePostLink(input);
  const self = target && target.id === String(currentPostId);
  const isAddress = /^(?:https?:|\/)/i.test(input.trim());
  const posts = useQuery({ queryKey: ['posts'], queryFn: fetchPosts });
  const preview = useQuery({
    queryKey: ['post', target?.id],
    queryFn: () => fetchPostById(target.id),
    enabled: Boolean(target && !self),
    retry: false,
  });
  const ready = target && !self && preview.isSuccess && !preview.isFetching;
  const unavailable =
    preview.error?.code === 'POST_NOT_FOUND' ||
    [403, 404].includes(preview.error?.response?.status);
  const query = input.trim().toLocaleLowerCase();
  const matches = (posts.data ?? [])
    .filter((post) => String(post.id) !== String(currentPostId))
    .filter((post) =>
      `${post.title} ${post.subtitle ?? ''} ${post.author?.name ?? ''}`
        .toLocaleLowerCase()
        .includes(query)
    )
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <Dialog ref={ref} aria-labelledby="post-link-heading" onCancel={onClose}>
      <h2 id="post-link-heading">글 카드 삽입</h2>
      <label htmlFor="post-link-search">글 URL 또는 검색어</label>
      <input
        id="post-link-search"
        autoFocus
        value={input}
        placeholder="글 제목을 검색하거나 URL을 붙여넣으세요"
        onChange={(event) => setInput(event.target.value)}
      />
      {target ? (
        <>
          {self ? (
            <Hint>현재 작성 중인 글은 연결할 수 없습니다.</Hint>
          ) : (
            <>
              <Hint>카드 미리보기</Hint>
              {preview.isPending || preview.isFetching ? (
                <Hint role="status">글을 불러오는 중…</Hint>
              ) : preview.isError ? (
                <Hint role="alert">
                  {unavailable
                    ? '볼 수 없는 글입니다.'
                    : '글을 불러오지 못했습니다.'}
                  {!unavailable && (
                    <Button type="button" onClick={() => preview.refetch()}>
                      다시 시도
                    </Button>
                  )}
                </Hint>
              ) : (
                <PostLinkCard
                  key={preview.data.id}
                  post={preview.data}
                  preview
                />
              )}
            </>
          )}
        </>
      ) : isAddress ? (
        <Hint role="alert">
          Unblind 글의 URL 또는 /posts/번호를 입력해 주세요.
        </Hint>
      ) : (
        <>
          <Hint>
            공개된 글을 선택하세요. 최근 글부터 최대 20개를 표시합니다.
          </Hint>
          {posts.isPending ? (
            <Hint role="status">글 목록을 불러오는 중…</Hint>
          ) : posts.isError ? (
            <Hint role="alert">
              글 목록을 불러오지 못했습니다. URL을 직접 입력하거나{' '}
              <Button type="button" onClick={() => posts.refetch()}>
                다시 시도
              </Button>
              해 주세요.
            </Hint>
          ) : matches.length ? (
            <Results aria-label="글 검색 결과">
              {matches.slice(0, 20).map((post) => (
                <li key={post.id}>
                  <Result
                    type="button"
                    onClick={() => setInput(`/posts/${post.id}`)}
                  >
                    {post.title}
                    <span>{post.author?.name}</span>
                  </Result>
                </li>
              ))}
            </Results>
          ) : (
            <Hint>검색 결과가 없습니다.</Hint>
          )}
        </>
      )}
      <Actions>
        <Button type="button" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          $primary
          disabled={!ready}
          onClick={() => onInsert(target.href)}
        >
          삽입
        </Button>
      </Actions>
    </Dialog>
  );
}
