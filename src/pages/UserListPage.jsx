import ProfileCard, {
  ProfileCardSkeleton,
} from '@components/cards/ProfileCard';
import Footer from '@components/common/Footer';
import { Section } from '@components/common/Section';
import BasicHeader from '@components/header/BasicHeader';
import useIntersection from '@hooks/useIntersection';
import useUsersInfiniteQuery from '@hooks/useUsersInfiniteQuery';
import { PAGINATION } from '@styles/constants';
import { transformCompanyLogos } from '@utils/transformCompanyLogos';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';

const CenteredCardList = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: center;
  min-height: 80vh;
  padding-top: 20px;
  max-width: 1024px;
  gap: 24px;
  margin: 0 auto;
`;

const StatusBlock = styled.div`
  text-align: center;
  font-size: 1.2rem;
  font-weight: 300;
  padding: 80px 0 40px;
`;

const RetryButton = styled.button`
  display: block;
  margin: 16px auto 0;
  padding: 8px 24px;
  font-size: 0.9rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.backgroundLight};
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
`;

// 도착할 카드 수와 같아야 스켈레톤이 실제 레이아웃을 그대로 예약한다.
const SKELETON_COUNT = PAGINATION.DEFAULT_PAGE_SIZE;
const LOADING_MORE_SKELETON_COUNT = 3;

// 카드 폭 160px에 목록이 max-width 1024px이라 한 행에 5장이 들어간다.
const PRIORITY_CARD_COUNT = 5;

function skeletonCards(count) {
  return Array.from({ length: count }, (_, index) => (
    <ProfileCardSkeleton key={index} />
  ));
}

function busyLabel({ loading, loadingMore }) {
  if (loading) return '사용자 목록을 불러오는 중';
  if (loadingMore) return '사용자 목록을 더 불러오는 중';
  return undefined;
}

export default function UserListPage() {
  const { users, loading, loadingMore, hasMore, error, fetchNextPage, retry } =
    useUsersInfiniteQuery();

  const sentinelRef = useIntersection(
    fetchNextPage,
    hasMore && !loadingMore && !error
  );

  const label = busyLabel({ loading, loadingMore });

  return (
    <>
      <BasicHeader />
      <Helmet>
        <title>Users | Unblind</title>
        <meta
          name="description"
          content="언블라인드의 사용자 목록을 확인해보세요."
        />
      </Helmet>
      <Section id="users" padding="100px 20px 100px 20px">
        <CenteredCardList
          role={label ? 'status' : undefined}
          aria-label={label}
        >
          {loading
            ? skeletonCards(SKELETON_COUNT)
            : users.map((user, index) => (
                <ProfileCard
                  key={user.id ?? user.username}
                  profileImage={user.profileImage}
                  name={user.name}
                  username={user.username || user.id}
                  bio={user.bio || ''}
                  companyLogos={transformCompanyLogos(user.careers)}
                  userType={user.userType}
                  priority={index < PRIORITY_CARD_COUNT}
                />
              ))}
          {loadingMore && skeletonCards(LOADING_MORE_SKELETON_COUNT)}
        </CenteredCardList>
        {error && (
          <StatusBlock role="alert">
            사용자 목록을 불러오지 못했습니다.
            <RetryButton onClick={() => retry()}>다시 시도</RetryButton>
          </StatusBlock>
        )}
        {/* 스켈레톤을 그리는 동안에는 users가 빈 배열이므로 loading을 함께 본다. */}
        {!error && !loading && users.length === 0 && (
          <StatusBlock>아직 등록된 사용자가 없습니다.</StatusBlock>
        )}
        {!error && !hasMore && users.length > 0 && (
          <StatusBlock>All users loaded</StatusBlock>
        )}
        <div ref={sentinelRef} aria-hidden="true" />
      </Section>
      <Footer />
    </>
  );
}
