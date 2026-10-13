import Footer from '@components/common/Footer';
import Loading from '@components/common/Loading';
import BasicHeader from '@components/header/BasicHeader';
import PostArticle from '@components/post/PostArticle';
import PostToc from '@components/post/PostToc';
import { useAuth } from '@contexts/AuthContext';
import useArticleHeadings, {
  useActiveHeading,
  useScrollToHash,
} from '@hooks/useArticleHeadings';
import usePost from '@hooks/usePost';
import { LAYOUT } from '@styles/constants';
import { formatDate } from '@utils/format';
import { estimateReadingMinutes } from '@utils/readingTime';
import { normalizeTags } from '@utils/tags';
import { toSafeHttpUrl } from '@utils/url';
import React, { useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';

import { POST_EDITOR_ENABLED } from '@/config';

const ARTICLE_WIDTH = 700;
const TOC_WIDTH = 220;
const TOC_GAP = 48;
const SIDE_PADDING = 20;
// The article stays centered on the page and the toc sits in the right gutter,
// so both gutters must fit the toc before it can be shown.
const TOC_MIN_VIEWPORT =
  ARTICLE_WIDTH + 2 * (TOC_GAP + TOC_WIDTH) + 2 * SIDE_PADDING;
const GUTTER = 'minmax(0, 1fr)';

const Layout = styled.div`
  width: 100%;
  /* border-box: the side padding is included, so the column itself maxes out at 700px. */
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
  font-size: 48px;
  font-weight: 700;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.ink};
  word-break: keep-all;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 32px;
  }
`;

const Subtitle = styled.p`
  margin-top: 12px;
  font-size: 19px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.inkSub};
`;

const TagList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  margin-top: 16px;
  list-style: none;
`;

const Tag = styled.li`
  margin: 0 8px 10px 0;
  padding: 2px 10px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.inkSurface};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
`;

const Byline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const AuthorLink = styled(Link)`
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.inkSub};
`;

const MetaDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.inkMuted};
`;

const EditLink = styled(Link)`
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkSub};
`;

const Dot = styled.span`
  &::before {
    content: '·';
  }
`;

const Thumbnail = styled.img`
  width: 100%;
  margin-top: 40px;
  border-radius: ${({ theme }) => theme.radius.md};
  aspect-ratio: 16 / 9;
  object-fit: cover;
`;

const ArticleArea = styled.div`
  margin-top: 40px;
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

const ExternalNotice = styled.p`
  margin-top: 40px;
  font-size: 17px;
  color: ${({ theme }) => theme.colors.inkSub};

  a {
    color: ${({ theme }) => theme.colors.accent};
    text-decoration: underline;
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

export default function PostPage() {
  const { postId } = useParams();
  const { post, loading } = usePost(postId);
  const { user } = useAuth();
  const articleRef = useRef(null);
  const content = post?.content || '';
  const headings = useArticleHeadings(articleRef, content);
  const activeId = useActiveHeading(headings);
  useScrollToHash(headings.length > 0);

  if (loading) return <Loading />;

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

  const externalUrl = toSafeHttpUrl(post.externalUrl);
  const tags = normalizeTags(post.tags);
  const description = (post.subtitle || content).slice(0, 80);
  const author =
    post.author?.name && post.author?.username ? post.author : null;
  const canEdit =
    POST_EDITOR_ENABLED && user != null && post.author?.id === user.id;

  return (
    <>
      <Helmet>
        <title>{`${post.title} | Unblind`}</title>
        <meta name="description" content={description} />
      </Helmet>

      <BasicHeader />
      <Layout>
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
              <Byline>
                {author && (
                  <AuthorLink to={`/${author.username}`}>
                    {author.name}
                  </AuthorLink>
                )}
                <MetaDetails>
                  <time dateTime={post.createdAt}>
                    {formatDate(post.createdAt)}
                  </time>
                  {content && (
                    <>
                      <Dot aria-hidden="true" />
                      <span>{`${estimateReadingMinutes(content)}분 읽기`}</span>
                    </>
                  )}
                </MetaDetails>
              </Byline>
              {canEdit && (
                <EditLink to={`/posts/${post.id}/edit`}>수정</EditLink>
              )}
            </Meta>
          </header>

          {post.thumbnail?.url && (
            <Thumbnail
              src={post.thumbnail.url}
              alt={post.thumbnail.altText || ''}
            />
          )}

          {content ? (
            <ArticleArea>
              <PostArticle ref={articleRef} content={content} reveal />
            </ArticleArea>
          ) : (
            externalUrl && (
              <ExternalNotice>
                이 포스트의 본문은 외부 블로그에 있습니다.{' '}
                <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                  원문 보러가기
                </a>
              </ExternalNotice>
            )
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
