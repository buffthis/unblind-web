import { fetchMySeries, fetchUserSeries } from '@apis/seriesApi';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import SeriesCollection from './SeriesCollection';
import { Button, Muted } from './seriesStyles';

const Wrapper = styled.div`
  width: 100%;
  max-width: 728px;
  margin: 32px auto 0;
  padding: 0 24px;
`;
const Switch = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  button {
    padding: 12px 0;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    font: inherit;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.inkSoft};
    cursor: pointer;
  }
  button[aria-pressed='true'] {
    color: ${({ theme }) => theme.colors.inkStrong};
    border-bottom-color: ${({ theme }) => theme.colors.inkStrong};
  }
  a {
    margin-left: auto;
    color: ${({ theme }) => theme.colors.inkSub};
    font-size: 12px;
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 4px;
  }
`;

export default function ProfileSeries({ userId, isMe, children }) {
  const [view, setView] = useState('posts');
  const query = useQuery({
    queryKey: isMe
      ? ['series-list', 'mine', userId]
      : ['series-list', String(userId)],
    queryFn: () => (isMe ? fetchMySeries() : fetchUserSeries(userId)),
    enabled: view === 'series',
    retry: false,
  });
  return (
    <>
      <Wrapper>
        <Switch aria-label="글 보기 방식">
          <button
            type="button"
            aria-pressed={view === 'posts'}
            onClick={() => setView('posts')}
          >
            전체 글
          </button>
          <button
            type="button"
            aria-pressed={view === 'series'}
            onClick={() => setView('series')}
          >
            시리즈
          </button>
          {isMe && <Link to="/series/new">새 시리즈 +</Link>}
        </Switch>
        {view === 'series' &&
          (query.data ? (
            <SeriesCollection series={query.data} editable={isMe} />
          ) : query.isPending ? (
            <Muted role="status">시리즈를 불러오는 중…</Muted>
          ) : (
            <>
              <Muted role="alert">시리즈 목록을 불러오지 못했습니다.</Muted>
              <Button onClick={() => query.refetch()}>다시 시도</Button>
            </>
          ))}
      </Wrapper>
      {view === 'posts' && children}
    </>
  );
}
