import { fetchPostById } from '@apis/postApi';
import { BOX_MARGIN } from '@components/post/spacing';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@utils/format';
import { toDirectImageUrl } from '@utils/imageUrl';
import { parsePostLink } from '@utils/postLink';
import { splitThumbnail } from '@utils/thumbnail';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Frame = styled.div`
  margin: ${BOX_MARGIN};
  min-width: 0;
`;

const Card = styled(Link)`
  && {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.md};
    color: ${({ theme }) => theme.colors.ink};
    text-decoration: none;
    background: ${({ theme }) => theme.colors.background};
    transition:
      background 150ms,
      border-color 150ms;
  }
  &&:hover {
    background: ${({ theme }) => theme.colors.inkSurface};
    border-color: ${({ theme }) => theme.colors.inkMuted};
  }
  &&:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 3px;
  }
`;

const Text = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px;
  overflow-wrap: anywhere;
  @media (max-width: 480px) {
    padding: 16px;
  }
`;
const Title = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: ${({ theme }) => theme.colors.inkStrong};
`;
const Description = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 13px;
  line-height: 20px;
  color: ${({ theme }) => theme.colors.inkSub};
  @media (max-width: 480px) {
    -webkit-line-clamp: 1;
  }
`;
const Meta = styled.span`
  font-size: 12px;
  line-height: 18px;
  color: ${({ theme }) => theme.colors.secondary};
`;
// The image does not set the card's height: the text does. Its frame stretches
// with the card, and the image fills that space right up to the outer edges.
const ThumbnailFrame = styled.span`
  position: relative;
  flex: 0 0 30%;
  min-width: 100px;
  overflow: hidden;
  border-left: ${({ $border, theme }) =>
    $border ? `1px solid ${theme.colors.border}` : 'none'};
  @media (max-width: 480px) {
    min-width: 88px;
  }
`;
const Thumbnail = styled.img`
  && {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    margin: 0;
    border-radius: 0;
    border: none;
  }
`;
const Status = styled.div`
  padding: 20px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 13px;
  line-height: 20px;
  color: ${({ theme }) => theme.colors.secondary};
  button {
    margin-left: 8px;
    font: inherit;
    color: inherit;
    background: none;
    border: none;
    text-decoration: underline;
    cursor: pointer;
  }
`;

export function PostLinkCard({ post, preview = false }) {
  const thumbnail = splitThumbnail(post.thumbnail?.url);
  const src = toDirectImageUrl(thumbnail.src);
  const [failedSrc, setFailedSrc] = useState(null);
  return (
    <Card
      as={preview ? 'div' : undefined}
      to={preview ? undefined : `/posts/${post.id}`}
      data-post-card=""
    >
      <Text>
        <Title>{post.title}</Title>
        {post.subtitle && <Description>{post.subtitle}</Description>}
        <Meta>
          {[post.author?.name, formatDate(post.createdAt)]
            .filter(Boolean)
            .join(' · ')}
        </Meta>
      </Text>
      {src && failedSrc !== src && (
        <ThumbnailFrame $border={thumbnail.border}>
          <Thumbnail
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailedSrc(src)}
          />
        </ThumbnailFrame>
      )}
    </Card>
  );
}

function RemoteCard({ target }) {
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ['post', target.id],
    queryFn: () => fetchPostById(target.id),
    retry: false,
  });
  if (isPending) return <Status role="status">글을 불러오는 중…</Status>;
  // A cached title must not survive a response saying the post is unavailable.
  if (error) {
    const unavailable =
      error.code === 'POST_NOT_FOUND' ||
      [403, 404].includes(error.response?.status);
    return (
      <Status>
        {unavailable ? '볼 수 없는 글입니다.' : '글을 불러오지 못했습니다.'}
        {!unavailable && (
          <button type="button" disabled={isFetching} onClick={() => refetch()}>
            다시 시도
          </button>
        )}
      </Status>
    );
  }
  return <PostLinkCard key={data.id} post={data} />;
}

export default function PostLinkBlock({ source }) {
  const target = parsePostLink(source);
  return (
    <Frame>
      {target ? (
        <RemoteCard key={target.id} target={target} />
      ) : (
        <Status>
          글 카드 주소를 확인해 주세요. Unblind 글의 URL 또는 /posts/번호를
          입력합니다.
        </Status>
      )}
    </Frame>
  );
}
