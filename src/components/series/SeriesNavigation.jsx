import { fetchSeries, publicSeriesPosts } from '@apis/seriesApi';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import SeriesContents from './SeriesContents';

const Block = styled.nav`
  margin-top: 32px;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.ink};
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 4px;
  }
`;
const Heading = styled.div`
  display: grid;
  justify-items: start;
  gap: 8px;
  font-size: 15px;
  a {
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  span {
    color: ${({ theme }) => theme.colors.inkSoft};
    font-size: 12px;
  }
`;
const Contents = styled.div`
  margin-top: 16px;
`;
const Continuation = styled.nav`
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 4px;
  }
`;
const Next = styled(Link)`
  display: block;
  padding: 20px 0;
  color: ${({ theme }) => theme.colors.inkStrong};
  span {
    display: block;
    font-size: 11px;
    color: ${({ theme }) => theme.colors.inkSoft};
  }
  strong {
    display: block;
    margin-top: 8px;
    font-size: 21px;
    font-weight: 500;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  strong span {
    display: inline;
    font-size: inherit;
    color: inherit;
  }
  p {
    font-size: 13px;
    margin-top: 8px;
    color: ${({ theme }) => theme.colors.inkSoft};
  }
  &:hover strong {
    text-decoration: underline;
    text-underline-offset: 5px;
  }
`;
const Previous = styled(Link)`
  display: inline-block;
  margin-top: 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
  &:hover {
    color: ${({ theme }) => theme.colors.ink};
  }
`;
const End = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkSoft};
  padding: 20px 0 4px;
`;
const Status = styled.p`
  font-size: 12px;
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.inkSoft};
  button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
    margin-left: 8px;
  }
`;

export function SeriesNavigationView({ series, postId, placement = 'top' }) {
  const posts = publicSeriesPosts(series.posts);
  const index = posts.findIndex((post) => String(post.id) === String(postId));
  if (index < 0) return null;
  const previous = posts[index - 1];
  const next = posts[index + 1];
  const href = `/series/${series.id}`;
  if (placement === 'bottom') {
    return (
      <Continuation aria-label="시리즈 이어 읽기">
        {next ? (
          <Next to={`/posts/${next.id}`}>
            <span>다음 글</span>
            <strong>
              {next.title} <span aria-hidden="true">→</span>
            </strong>
            {next.subtitle && <p>{next.subtitle}</p>}
          </Next>
        ) : (
          <End>마지막으로 공개된 글입니다.</End>
        )}
        {previous && (
          <Previous to={`/posts/${previous.id}`}>
            ← 이전 글 · {previous.title}
          </Previous>
        )}
      </Continuation>
    );
  }
  return (
    <Block aria-label="이 글의 시리즈">
      <Heading>
        <Link to={href}>{series.title}</Link>
        <span>
          {index + 1} / {posts.length}편
        </span>
      </Heading>
      <Contents>
        <SeriesContents posts={posts} currentPostId={postId} compact />
      </Contents>
    </Block>
  );
}

export default function SeriesNavigation({ seriesId, postId, placement }) {
  const query = useQuery({
    queryKey: ['series', String(seriesId)],
    queryFn: () => fetchSeries(seriesId),
    retry: false,
  });
  if (query.data)
    return (
      <SeriesNavigationView
        series={query.data}
        postId={postId}
        placement={placement}
      />
    );
  if (placement === 'bottom') return null;
  return (
    <Status role="status">
      {query.isPending
        ? '시리즈를 불러오는 중…'
        : '시리즈를 불러오지 못했습니다.'}
      {query.isError && (
        <button type="button" onClick={() => query.refetch()}>
          다시 시도
        </button>
      )}
    </Status>
  );
}
