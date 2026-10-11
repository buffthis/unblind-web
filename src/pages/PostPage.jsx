import Footer from '@components/common/Footer';
import Loading from '@components/common/Loading';
import BasicHeader from '@components/header/BasicHeader';
import PostArticle from '@components/post/PostArticle';
import PostToc from '@components/post/PostToc';
import useArticleHeadings, {
  useActiveHeading,
  useScrollToHash,
} from '@hooks/useArticleHeadings';
import usePost from '@hooks/usePost';
import { LAYOUT } from '@styles/constants';
import { formatDate } from '@utils/format';
import { estimateReadingMinutes } from '@utils/readingTime';
import { toSafeHttpUrl } from '@utils/url';
import React, { useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';

const Layout = styled.div`
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  padding: 48px 20px 96px;

  @media (min-width: ${({ theme }) => theme.breakpoints.wide}) {
    max-width: calc(700px + 48px + 220px);
    display: grid;
    grid-template-columns: minmax(0, 700px) 220px;
    column-gap: 48px;
  }
`;

const Aside = styled.aside`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.wide}) {
    display: block;
  }
`;

const StickyToc = styled.div`
  position: sticky;
  top: ${LAYOUT.HEADER_HEIGHT + 48}px;
`;

const Title = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.primary};
  word-break: keep-all;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 1.75rem;
  }
`;

const Subtitle = styled.p`
  margin-top: 12px;
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

const AuthorLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

const Dot = styled.span`
  &::before {
    content: '·';
  }
`;

const Thumbnail = styled.img`
  width: 100%;
  margin: 32px 0 8px;
  border-radius: ${({ theme }) => theme.radius.md};
  aspect-ratio: 16 / 9;
  object-fit: cover;
`;

const ArticleArea = styled.div`
  margin-top: 32px;
`;

const AuthorCard = styled.div`
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

const ExternalNotice = styled.p`
  margin-top: 32px;
  color: ${({ theme }) => theme.colors.secondary};

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
  const description = (post.subtitle || content).slice(0, 80);
  const author =
    post.author?.name && post.author?.username ? post.author : null;

  return (
    <>
      <Helmet>
        <title>{`${post.title} | Unblind`}</title>
        <meta name="description" content={description} />
      </Helmet>

      <BasicHeader />
      <Layout>
        <main>
          <header>
            <Title>{post.title}</Title>
            {post.subtitle && <Subtitle>{post.subtitle}</Subtitle>}
            <MetaRow>
              {author && (
                <>
                  <AuthorLink to={`/${author.username}`}>
                    {author.name}
                  </AuthorLink>
                  <Dot aria-hidden="true" />
                </>
              )}
              <time dateTime={post.createdAt}>
                {formatDate(post.createdAt)}
              </time>
              {content && (
                <>
                  <Dot aria-hidden="true" />
                  <span>{`${estimateReadingMinutes(content)}분 읽기`}</span>
                </>
              )}
            </MetaRow>
          </header>

          {post.thumbnail?.url && (
            <Thumbnail
              src={post.thumbnail.url}
              alt={post.thumbnail.altText || ''}
            />
          )}

          {content ? (
            <ArticleArea>
              <PostArticle ref={articleRef} content={content} />
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
        </main>

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
