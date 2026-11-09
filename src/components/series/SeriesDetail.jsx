import { publicSeriesPosts } from '@apis/seriesApi';
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import SeriesContents from './SeriesContents';
import {
  Actions,
  Button,
  Description,
  Eyebrow,
  Muted,
  SeriesTitle,
  TextLink,
} from './seriesStyles';

const Meta = styled.div`
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
  a {
    color: ${({ theme }) => theme.colors.ink};
  }
`;
const Contents = styled.section`
  margin-top: 56px;
  h2 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 500;
    padding-bottom: 16px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  h2 span {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.inkSoft};
    font-weight: 400;
  }
`;
const SeriesEyebrow = styled(Eyebrow)`
  margin-top: 48px;
`;

export default function SeriesDetail({ series, canEdit = false }) {
  const posts = publicSeriesPosts(series.posts);
  return (
    <>
      {series.author?.username && (
        <TextLink to={`/${series.author.username}#posts`}>
          ← {series.author.name}의 글
        </TextLink>
      )}
      <header>
        <SeriesEyebrow>SERIES</SeriesEyebrow>
        <SeriesTitle>{series.title}</SeriesTitle>
        {series.description && <Description>{series.description}</Description>}
        <Meta>
          {series.author?.username && (
            <Link to={`/${series.author.username}`}>{series.author.name}</Link>
          )}
          <span>{posts.length}편 공개</span>
        </Meta>
        <Actions>
          {posts.length > 0 && (
            <Button as={Link} to={`/posts/${posts[0].id}`} $primary>
              첫 글부터 읽기 <span aria-hidden="true">→</span>
            </Button>
          )}
          {canEdit && (
            <TextLink to={`/series/${series.id}/edit`}>시리즈 관리</TextLink>
          )}
        </Actions>
      </header>
      <Contents aria-labelledby="series-contents-title">
        <h2 id="series-contents-title">
          이 시리즈의 글{' '}
          <span>{String(posts.length).padStart(2, '0')} ARTICLES</span>
        </h2>
        {posts.length ? (
          <SeriesContents posts={posts} />
        ) : (
          <Muted>아직 공개된 글이 없습니다.</Muted>
        )}
      </Contents>
    </>
  );
}
