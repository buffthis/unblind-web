import { fetchSeries, publicSeriesPosts } from '@apis/seriesApi';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useId, useRef, useState } from 'react';
import {
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { toDirectImageUrl } from '@utils/imageUrl';
import { splitThumbnail } from '@utils/thumbnail';

// Past this many chapters, one segment per chapter gets too thin to read,
// so the progress switches to a single continuous bar.
const MAX_SEGMENTS = 10;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`;
const OPEN_DURATION = '0.22s';
const cardBackground = css`
  background: color-mix(
    in srgb,
    ${({ theme }) => theme.colors.inkSurface} 45%,
    ${({ theme }) => theme.colors.background}
  );
`;
// The banner is the hover zone. The chapter panel is its child, so moving the
// pointer from the card down into the panel does not count as leaving.
const Banner = styled.nav`
  position: relative;
  z-index: ${({ $open }) => ($open ? 20 : 'auto')};
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors.ink};
`;
const Card = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ $open }) => ($open ? '8px 8px 0 0' : '8px')};
  ${cardBackground}
  transition: border-radius 0s linear ${({ $open }) =>
    $open ? '0s' : OPEN_DURATION};
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
  cursor: default;
`;
const Panel = styled.div`
  position: absolute;
  top: calc(100% - 1px);
  left: 0;
  right: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.inkSurface};
  border-radius: 0 0 8px 8px;
  ${cardBackground}
  box-shadow: 0 12px 24px rgba(25, 31, 40, 0.08);
  /* Reveal from the top edge down; the negative insets leave room for the shadow. */
  clip-path: ${({ $open }) =>
    $open ? 'inset(0 -32px -40px -32px)' : 'inset(0 0 100% 0)'};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  transition:
    clip-path ${OPEN_DURATION} ease,
    visibility 0s linear ${({ $open }) => ($open ? '0s' : OPEN_DURATION)};
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const Hint = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.inkMuted};
  transition: transform ${OPEN_DURATION} ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;
const Label = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.inkSoft};
  word-break: keep-all;
  overflow-wrap: anywhere;
  a {
    color: ${({ theme }) => theme.colors.inkStrong};
    font-weight: 500;
    text-decoration: none;
    ${focusRing}
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;
const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-variant-numeric: tabular-nums;
`;
const Segments = styled.span`
  display: flex;
  gap: 4px;
`;
const Segment = styled.span`
  width: 28px;
  height: 4px;
  border-radius: 999px;
  background: ${({ $filled, theme }) =>
    $filled ? theme.colors.inkStrong : theme.colors.border};
`;
const Track = styled.span`
  position: relative;
  width: 148px;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.border};
  &::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: ${({ $ratio }) => `${$ratio * 100}%`};
    background: ${({ theme }) => theme.colors.inkStrong};
  }
`;
const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;
const controlBox = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.inkStrong};
  font: inherit;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.inkSurface};
    text-decoration: none;
  }
  &:disabled {
    color: ${({ theme }) => theme.colors.inkMuted};
    background: ${({ theme }) => theme.colors.background};
    cursor: default;
  }
  ${focusRing}
`;
const StepLink = styled(Link)`
  ${controlBox}
  width: 34px;
`;
const StepDisabled = styled.button`
  ${controlBox}
  width: 34px;
`;
const MenuList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 6px 8px 8px;
  max-height: 320px;
  overflow-y: auto;
`;
const itemBox = css`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 16px;
  align-items: baseline;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.55;
  word-break: keep-all;
  overflow-wrap: anywhere;
  > span:first-child {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.inkMuted};
  }
  > svg {
    align-self: center;
  }
`;
const ItemLink = styled(Link)`
  ${itemBox}
  color: ${({ theme }) => theme.colors.ink};
  text-decoration: none;
  &:hover {
    background: ${({ theme }) => theme.colors.inkSurface};
    text-decoration: none;
  }
  ${focusRing}
`;
const ItemCurrent = styled.span`
  ${itemBox}
  color: ${({ theme }) => theme.colors.inkStrong};
  font-weight: 600;
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
  grid-template-columns:
    minmax(0, 1fr)
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

function ChapterProgress({ index, total, open }) {
  return (
    <Progress>
      {total <= MAX_SEGMENTS ? (
        <Segments aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <Segment key={i} $filled={i <= index} />
          ))}
        </Segments>
      ) : (
        <Track aria-hidden="true" $ratio={(index + 1) / total} />
      )}
      <span>
        {total}편 중 {index + 1}번째
      </span>
      <Hint aria-hidden="true" $open={open}>
        <FiChevronDown size={14} />
      </Hint>
    </Progress>
  );
}

function StepControl({ post, direction }) {
  const label = direction === 'prev' ? '이전 글' : '다음 글';
  const Icon = direction === 'prev' ? FiChevronLeft : FiChevronRight;
  if (!post) {
    return (
      <StepDisabled type="button" disabled aria-label={`${label} 없음`}>
        <Icon aria-hidden="true" size={16} />
      </StepDisabled>
    );
  }
  return (
    <StepLink
      to={`/posts/${post.id}`}
      aria-label={`${label}: ${post.title}`}
      title={post.title}
    >
      <Icon aria-hidden="true" size={16} />
    </StepLink>
  );
}

function ChapterList({ posts, index }) {
  return (
    <MenuList aria-label="시리즈 회차">
      {posts.map((post, i) => {
        const number = String(i + 1).padStart(2, '0');
        return (
          <li key={post.id}>
            {i === index ? (
              <ItemCurrent aria-current="page">
                <span>{number}</span>
                <span>{post.title}</span>
                <FiCheck aria-hidden="true" size={14} />
              </ItemCurrent>
            ) : (
              <ItemLink to={`/posts/${post.id}`}>
                <span>{number}</span>
                <span>{post.title}</span>
              </ItemLink>
            )}
          </li>
        );
      })}
    </MenuList>
  );
}

// Touch screens have no hover, so there a tap on the card toggles the list.
function canHover() {
  return window.matchMedia?.('(hover: hover)').matches ?? true;
}

function SeriesBanner({ series, posts, index }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };
  const handleInfoClick = (event) => {
    if (canHover() || event.target.closest('a')) return;
    setOpen((value) => !value);
  };

  return (
    <Banner
      ref={rootRef}
      aria-label="이 글의 시리즈"
      $open={open}
      onMouseEnter={() => canHover() && setOpen(true)}
      onMouseLeave={() => canHover() && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={handleBlur}
      onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
    >
      <Card $open={open}>
        <Info onClick={handleInfoClick}>
          <Label>
            시리즈 · <Link to={`/series/${series.id}`}>{series.title}</Link>
          </Label>
          <ChapterProgress index={index} total={posts.length} open={open} />
        </Info>
        <Controls>
          <StepControl post={posts[index - 1]} direction="prev" />
          <StepControl post={posts[index + 1]} direction="next" />
        </Controls>
      </Card>
      <Panel
        id={panelId}
        $open={open}
        aria-hidden={!open}
        inert={open ? undefined : ''}
      >
        <ChapterList posts={posts} index={index} />
      </Panel>
    </Banner>
  );
}

export function SeriesNavigationView({ series, postId, placement = 'top' }) {
  const posts = publicSeriesPosts(series.posts);
  const index = posts.findIndex((post) => String(post.id) === String(postId));
  if (index < 0) return null;
  const next = posts[index + 1];
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
  return <SeriesBanner series={series} posts={posts} index={index} />;
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
