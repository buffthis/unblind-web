import Avatar from '@components/common/Avatar';
import Footer from '@components/common/Footer';
import Loading from '@components/common/Loading';
import { useLoadingHold } from '@components/common/loadingRun';
import BasicHeader from '@components/header/BasicHeader';
import { BODY_ENTRANCE, riseIn } from '@components/post/entrance';
import PostArticle from '@components/post/PostArticle';
import PostToc from '@components/post/PostToc';
import { useAuth } from '@contexts/AuthContext';
import useArticleHeadings, {
  useActiveHeading,
  useScrollToHash,
} from '@hooks/useArticleHeadings';
import usePost from '@hooks/usePost';
import useUser from '@hooks/useUser';
import { LAYOUT } from '@styles/constants';
import { formatDate } from '@utils/format';
import { normalizeTags } from '@utils/tags';
import { splitThumbnail } from '@utils/thumbnail';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import styled, { css } from 'styled-components';

import { POST_EDITOR_ENABLED } from '@/config';

const ARTICLE_WIDTH = 550;
const TOC_WIDTH = 220;
const TOC_GAP = 48;
const SIDE_PADDING = 24;
// The article stays centered on the page and the toc sits in the right gutter,
// so both gutters must fit the toc before it can be shown.
const TOC_MIN_VIEWPORT =
  ARTICLE_WIDTH + 2 * (TOC_GAP + TOC_WIDTH) + 2 * SIDE_PADDING;
const GUTTER = 'minmax(0, 1fr)';

const Layout = styled.div`
  width: 100%;
  /* border-box: the side padding is included, so the column itself maxes out at 550px. */
  max-width: ${ARTICLE_WIDTH + 2 * SIDE_PADDING}px;
  margin: 0 auto;
  padding: 48px ${SIDE_PADDING}px 96px;
  /* Same reason as the article body: keeps the title and meta from rendering heavier on macOS. */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  @media (min-width: ${TOC_MIN_VIEWPORT}px) {
    max-width: none;
    display: grid;
    grid-template-columns: ${GUTTER} minmax(0, ${ARTICLE_WIDTH}px) ${GUTTER};
    column-gap: ${TOC_GAP}px;
  }
`;

const Main = styled.main`
  grid-column: 2;
`;

const Aside = styled.aside`
  display: none;

  @media (min-width: ${TOC_MIN_VIEWPORT}px) {
    display: block;
    grid-column: 3;
    max-width: ${TOC_WIDTH}px;
  }
`;

const StickyToc = styled.div`
  position: sticky;
  top: ${LAYOUT.HEADER_HEIGHT + 48}px;
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 600;
  line-height: 30px;
  letter-spacing: -0.1px;
  color: ${({ theme }) => theme.colors.ink};
  word-break: keep-all;
  ${riseIn(0)}
`;

const Subtitle = styled.p`
  font-size: 15px;
  font-weight: 460;
  line-height: 24px;
  letter-spacing: -0.1px;
  color: ${({ theme }) => theme.colors.inkSub};
  word-break: keep-all;
  ${riseIn(1)}
`;

const TAG_GAP = 5;

const TagList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
  /* Takes back the space under the last row, so the list ends where its tags end. */
  margin-bottom: -${TAG_GAP}px;
  list-style: none;
  ${riseIn(2)}
`;

const Tag = styled.li`
  margin: 0 ${TAG_GAP}px ${TAG_GAP}px 0;
  padding: 0 7px;
  border-radius: 5px;
  background: ${({ theme }) => theme.colors.inkSurface};
  font-size: 11px;
  font-weight: 460;
  line-height: 19px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

// The photo sits 0.75px inside the 34.5px byline row, so a 31.25px margin leaves the
// photo 32px from whatever is above it and below it.
const BYLINE_GAP = 31.25;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: ${BYLINE_GAP}px;
  ${riseIn(3)}
`;

const Byline = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

// A long job title is cut with an ellipsis instead of pushing the edit button away.
const Job = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AuthorLink = styled(Link)`
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  line-height: 16.5px;
  color: ${({ theme }) => theme.colors.inkSub};
`;

// The light small text under the name (the job) and at the right end (the date).
// With the name's 16.5px line, the 16px line keeps the two lines about 5.5px apart.
const subtleText = css`
  font-size: 12.6px;
  font-weight: 300;
  letter-spacing: 0.02em;
  line-height: 16px;
  color: ${({ theme }) => theme.colors.inkMuted};
`;

const MetaDetails = styled.div`
  display: flex;
  ${subtleText}
`;

const PostDate = styled.time`
  white-space: nowrap;
  ${subtleText}
`;

// The date and the edit button stay at the right end and never shrink, so a long
// job title is the one that gives way.
const MetaAside = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin-left: auto;
`;

const EditLink = styled(Link)`
  flex-shrink: 0;
  white-space: nowrap;
  padding: 4px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkSub};
`;

const Thumbnail = styled.img`
  width: 100%;
  margin-top: ${BYLINE_GAP}px;
  border-radius: ${({ theme }) => theme.radius.md};
  aspect-ratio: 16 / 9;
  object-fit: cover;
  ${riseIn(4)}

  &[data-border] {
    border: 1px solid #ececec;
  }
`;

const ArticleArea = styled.div`
  margin-top: 40px;

  /* With no thumbnail the body follows the byline directly. */
  header + & {
    margin-top: ${BYLINE_GAP}px;
  }
`;

const AuthorCard = styled.div`
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 15px;
  color: ${({ theme }) => theme.colors.inkMuted};

  ${AuthorLink} {
    font-size: inherit;
    color: ${({ theme }) => theme.colors.ink};
  }
`;

const ErrorState = styled.div`
  width: 100%;
  text-align: center;
  padding: 160px 20px;
  color: ${({ theme }) => theme.colors.secondary};

  h2 {
    font-weight: 400;
    margin-bottom: 12px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-top: 24px;
  padding: 8px 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.primary};
`;

// A #hash that names an element lands mid-article, past the header the entrance
// starts with. One left over from a renamed heading leaves the page at the top.
function landsOnTarget() {
  const hash = window.location.hash.slice(1);
  if (!hash) return false;
  try {
    return document.getElementById(decodeURIComponent(hash)) != null;
  } catch {
    return false;
  }
}

export default function PostPage() {
  const { postId } = useParams();
  const { post, loading } = usePost(postId);
  const waiting = useLoadingHold(loading);
  const { user } = useAuth();
  // The post carries only the author's name, so the profile photo comes from the
  // profile, which the user page shares through the same query cache entry.
  const authorUsername = post?.author?.name ? post.author.username : undefined;
  const { user: authorProfile } = useUser(authorUsername);
  const articleRef = useRef(null);
  const content = post?.content || '';
  const headings = useArticleHeadings(articleRef, content);
  const activeId = useActiveHeading(headings);
  useScrollToHash(headings.length > 0);
  // Decided once per post, so following a toc link later does not replay it.
  // It runs after the article is in the DOM but before it is painted, since
  // only then can a #hash be checked against the heading ids.
  const [entranceFor, setEntranceFor] = useState(null);
  const articleShown = !waiting && post != null;
  useLayoutEffect(() => {
    if (!articleShown) return;
    setEntranceFor((current) =>
      current?.postId === postId ? current : { postId, on: !landsOnTarget() }
    );
  }, [articleShown, postId]);
  const entrance = entranceFor?.postId === postId && entranceFor.on;

  if (waiting) return <Loading />;

  // A cached post stays on screen even if a background refetch fails.
  if (!post) {
    return (
      <>
        <BasicHeader />
        <ErrorState>
          <h2>포스트를 불러올 수 없습니다</h2>
          <p>존재하지 않거나 삭제된 포스트입니다.</p>
          <BackLink to="/posts">포스트 목록으로</BackLink>
        </ErrorState>
        <Footer />
      </>
    );
  }

  const tags = normalizeTags(post.tags);
  const thumbnail = splitThumbnail(post.thumbnail?.url);
  const description = (post.subtitle || content).slice(0, 80);
  const author =
    post.author?.name && post.author?.username ? post.author : null;
  // The job title of the author's current career (one with no end date).
  const job = authorProfile.careers.find((career) => !career.endDate)?.position;
  const canEdit =
    POST_EDITOR_ENABLED && user != null && post.author?.id === user.id;

  return (
    <>
      <Helmet>
        <title>{`${post.title} | Unblind`}</title>
        <meta name="description" content={description} />
      </Helmet>

      <BasicHeader />
      <Layout key={postId} data-entrance={entrance ? '' : undefined}>
        <Main>
          <header>
            <Title>{post.title}</Title>
            {post.subtitle && <Subtitle>{post.subtitle}</Subtitle>}
            {tags.length > 0 && (
              <TagList aria-label="태그">
                {tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </TagList>
            )}
            <Meta>
              {author && (
                <Avatar
                  src={authorProfile.profileImage?.url}
                  size={33}
                  borderWidth={0.75}
                />
              )}
              <Byline>
                {author && (
                  <AuthorLink to={`/${author.username}`}>
                    {author.name}
                  </AuthorLink>
                )}
                {job && (
                  <MetaDetails>
                    <Job>{job}</Job>
                  </MetaDetails>
                )}
              </Byline>
              <MetaAside>
                <PostDate dateTime={post.createdAt}>
                  {formatDate(post.createdAt)}
                </PostDate>
                {canEdit && (
                  <EditLink to={`/posts/${post.id}/edit`}>수정</EditLink>
                )}
              </MetaAside>
            </Meta>
          </header>

          {thumbnail.src && (
            <Thumbnail
              src={thumbnail.src}
              alt={post.thumbnail.altText || ''}
              data-border={thumbnail.border ? '' : undefined}
            />
          )}

          {content && (
            <ArticleArea>
              <PostArticle
                ref={articleRef}
                content={content}
                reveal
                entrance={entrance ? BODY_ENTRANCE : undefined}
              />
            </ArticleArea>
          )}

          {author && (
            <AuthorCard>
              <AuthorLink to={`/${author.username}`}>{author.name}</AuthorLink>
              {' 님의 글'}
            </AuthorCard>
          )}
        </Main>

        <Aside>
          <StickyToc>
            <PostToc headings={headings} activeId={activeId} />
          </StickyToc>
        </Aside>
      </Layout>
      <Footer />
    </>
  );
}
