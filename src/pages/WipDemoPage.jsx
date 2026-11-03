import PostCard from '@components/cards/PostCard';
import BasicHeader from '@components/header/BasicHeader';
import PostArticle from '@components/post/PostArticle';
import WipBanner from '@components/post/WipBanner';
import React from 'react';
import styled from 'styled-components';

// Dev-only sample of the "published but unfinished" markers. The post fields used here
// (wip, wipMissing) are placeholders: the backend has no such field yet.

const THUMBNAIL = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#F2F4F6"/></svg>'
)}`;

const POSTS = [
  {
    id: 1,
    title: '결제 서버 장애 회고',
    subtitle: '완성된 글은 아무 표시도 없습니다.',
    thumbnail: { url: THUMBNAIL },
    tags: ['회고'],
  },
  {
    id: 2,
    title: '이벤트 소싱 도입기',
    subtitle: '작성 중인 글은 제목 옆에 배지만 붙습니다.',
    thumbnail: { url: THUMBNAIL },
    tags: ['아키텍처'],
    wip: true,
  },
];

const CONTENT = `## 배경

이 절은 다 쓴 상태입니다. 아무 표시도 없습니다.

## 설계

문장 안에도 쓸 수 있습니다. 스냅샷 주기 [[🚧 작성 중|wip]] 는 아직 정하지 못했고, 이벤트 스토어 [[v2|green]], [[beta|blue]], [[주의|amber]], [[폐기 예정|red]], [[그냥 배지]] 처럼 붙입니다.

> [!WIP]
> 이벤트 스토어 스키마와 스냅샷 주기 결정 과정을 정리할 예정입니다.

## 결과

숫자는 확정됐지만 해석은 아직 덜 썼습니다.

> [!WIP]
> 지연 시간 변화 그래프와 해석을 추가할 예정입니다.
`;

const Page = styled.main`
  max-width: 550px;
  margin: 0 auto;
  padding: 32px 24px 96px;
`;

const Heading = styled.h1`
  margin: 40px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.inkSoft};

  &:first-child {
    margin-top: 0;
  }
`;

const Cards = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
`;

export default function WipDemoPage() {
  return (
    <>
      <BasicHeader />
      <Page>
        <Heading>1. 목록 카드 (배지만)</Heading>
        <Cards>
          {POSTS.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </Cards>

        <Heading>2. 글 상단 배너 (글 전체)</Heading>
        <WipBanner
          updatedAt="2026.11.03"
          missing={['설계: 스키마와 스냅샷 주기', '결과: 지연 시간 해석']}
        />

        <Heading>3. 본문 안 섹션 표시 (&gt; [!WIP])</Heading>
        <PostArticle content={CONTENT} />
      </Page>
    </>
  );
}
