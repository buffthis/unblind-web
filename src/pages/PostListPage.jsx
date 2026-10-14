import PostCard from '@components/cards/PostCard';
import Footer from '@components/common/Footer';
import Loading from '@components/common/Loading';
import { Section, SectionTitle } from '@components/common/Section';
import BasicHeader from '@components/header/BasicHeader';
import usePosts from '@hooks/usePosts';
import { ProjectList } from '@styles/compositions/Project.styles';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';

const StatusBlock = styled.div`
  text-align: center;
  font-size: 1.2rem;
  font-weight: 300;
  padding: 80px 0 40px;
`;

export default function PostListPage() {
  const { posts, loading, error } = usePosts();

  if (loading) return <Loading />;

  return (
    <>
      <Helmet>
        <title>Posts | Unblind</title>
        <meta
          name="description"
          content="언블라인드 사용자들이 작성한 포스트를 모아 보여줍니다."
        />
      </Helmet>
      <BasicHeader />
      <Section id="posts" padding="60px 20px 100px 20px">
        <SectionTitle>Posts</SectionTitle>
        {error && posts.length === 0 && (
          <StatusBlock role="alert">
            포스트 목록을 불러오지 못했습니다.
          </StatusBlock>
        )}
        {!error && posts.length === 0 && (
          <StatusBlock>아직 등록된 포스트가 없습니다.</StatusBlock>
        )}
        {posts.length > 0 && (
          <ProjectList>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </ProjectList>
        )}
      </Section>
      <Footer />
    </>
  );
}
