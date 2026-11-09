import SeriesDetail from '@components/series/SeriesDetail';
import { SeriesNavigationView } from '@components/series/SeriesNavigation';
import {
  Description,
  Muted,
  SeriesPageLayout,
  SeriesTitle,
} from '@components/series/seriesStyles';
import React, { useState } from 'react';
import styled from 'styled-components';

const Body = styled.div`
  margin-top: 40px;
  h2 {
    margin: 40px 0 16px;
    font-size: 21px;
    font-weight: 600;
  }
  p {
    font-size: 15px;
    color: ${({ theme }) => theme.colors.inkSub};
    line-height: 1.95;
    margin-bottom: 20px;
  }
`;
const series = {
  id: 'preview',
  title: '작은 서비스가 성장하는 과정',
  description:
    '처음 만든 서비스가 사용자를 만나고, 조금씩 단단해지기까지.\n설계와 운영 사이에서 배운 것들을 기록합니다.',
  color: 'sage',
  author: { id: 1, name: '조형준' },
  posts: [
    {
      id: 'preview-1',
      title: '작게 시작하기',
      subtitle: '첫 번째 버전에서 꼭 필요한 것만 남기는 일',
    },
    {
      id: 'preview-2',
      title: '느린 페이지에서 찾은 단서',
      subtitle: '측정으로 시작하는 성능 개선 이야기',
    },
    {
      id: 'preview-3',
      title: '캐시는 언제 비워야 할까',
      subtitle: '빠른 응답과 정확한 데이터 사이의 균형',
    },
    {
      id: 'preview-4',
      title: '실패해도 괜찮은 시스템',
      subtitle: '작은 장애를 통해 배운 복구와 관찰',
    },
  ],
};

// Development-only composition of the real reader components. No fake API or
// persistence: following a sample link keeps the preview on the selected chapter.
export default function SeriesPreviewPage() {
  const [view, setView] = useState('article');
  const [postId, setPostId] = useState('preview-2');
  const selected = series.posts.find((post) => post.id === postId);
  const handleLink = (event) => {
    const anchor = event.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (href.startsWith('/posts/preview-')) {
      event.preventDefault();
      setPostId(href.split('/').at(-1));
      setView('article');
      window.scrollTo(0, 0);
    } else if (href.startsWith('/series/preview')) {
      event.preventDefault();
      setView('detail');
    }
  };
  return (
    <div onClickCapture={handleLink}>
      <SeriesPageLayout>
        {view === 'detail' ? (
          <SeriesDetail series={series} />
        ) : (
          <>
            <SeriesTitle>{selected.title}</SeriesTitle>
            <Description>{selected.subtitle}</Description>
            <Muted>조형준 · 2026.11.08</Muted>
            <SeriesNavigationView series={series} postId={postId} />
            <Body>
              <h2>문제를 발견하는 순간</h2>
              <p>
                서비스를 만들다 보면 처음에는 보이지 않던 것들이 보이기
                시작합니다. 잘 동작하는 기능과 편하게 사용할 수 있는 기능
                사이에는 생각보다 많은 차이가 있었습니다.
              </p>
              <p>
                이번 글에서는 작은 단서를 따라 문제를 찾아가고, 선택의 이유를
                기록하는 과정을 이야기합니다.
              </p>
              <h2>작은 개선을 쌓아가기</h2>
              <p>
                모든 것을 한 번에 바꾸기보다, 지금 가장 중요한 문제부터
                해결했습니다. 측정하고, 바꾸고, 다시 확인하는 과정을 반복하며
                다음 선택을 위한 기준을 만들었습니다.
              </p>
            </Body>
            <SeriesNavigationView
              series={series}
              postId={postId}
              placement="bottom"
            />
          </>
        )}
      </SeriesPageLayout>
    </div>
  );
}
