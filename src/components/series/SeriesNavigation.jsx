import { fetchSeries, publicSeriesPosts } from '@apis/seriesApi';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { toDirectImageUrl } from '@utils/imageUrl';
import { splitThumbnail } from '@utils/thumbnail';

import SeriesContents from './SeriesContents';

const Block = styled.nav`
  margin-top: 32px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.ink};
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 4px;
  }
`;
const Heading = styled.div`
  font-size: 15px;
  a {
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
`;
const Contents = styled.div`
  margin-top: 12px;
`;
const Continuation = styled.nav`
  margin-top: 40px;
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 4px;
  }
`;
const Next = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr)
    ${({ $hasThumbnail, $hasSubtitle }) =>
      !$hasThumbnail
        ? '0'
        : $hasSubtitle
          ? 'clamp(128px, 36%, 216px)'
          : 'clamp(128px, 30%, 178px)'};
  align-items: stretch;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.inkStrong};
  text-decoration: none;
  &:hover {
    text-decoration: none;
  }
`;
const NextCopy = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  span {
    display: block;
    font-size: 12px;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.inkSoft};
  }
  strong {
    display: block;
    min-width: 0;
    font-size: 18px;
    font-weight: 500;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  p {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
    color: ${({ theme }) => theme.colors.inkSoft};
  }
`;
const NextThumbnail = styled.img`
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  min-height: 0;
  align-self: stretch;
  object-fit: cover;
`;
const End = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin: 0;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
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

function NextChapterCard({ post }) {
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnail = splitThumbnail(post.thumbnail?.url);
  const thumbnailSrc = toDirectImageUrl(thumbnail.src);
  const hasThumbnail = Boolean(thumbnailSrc && !imageFailed);
  const hasSubtitle = Boolean(post.subtitle);

  return (
    <Next
      to={`/posts/${post.id}`}
      $hasThumbnail={hasThumbnail}
      $hasSubtitle={hasSubtitle}
    >
      <NextCopy>
        <span>다음 글</span>
        <strong>{post.title}</strong>
        {post.subtitle && <p>{post.subtitle}</p>}
      </NextCopy>
      {hasThumbnail && (
        <NextThumbnail
          src={thumbnailSrc}
          alt=""
          onError={() => setImageFailed(true)}
        />
      )}
    </Next>
  );
}

export function SeriesNavigationView({ series, postId, placement = 'top' }) {
  const posts = publicSeriesPosts(series.posts);
  const index = posts.findIndex((post) => String(post.id) === String(postId));
  if (index < 0) return null;
  const next = posts[index + 1];
  const href = `/series/${series.id}`;
  if (placement === 'bottom') {
    return (
      <Continuation aria-label="시리즈 이어 읽기">
        {next ? (
          <NextChapterCard post={next} />
        ) : (
          <End>마지막으로 공개된 글입니다.</End>
        )}
      </Continuation>
    );
  }
  return (
    <Block aria-label="이 글의 시리즈">
      <Heading>
        <Link to={href}>{series.title}</Link>
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
