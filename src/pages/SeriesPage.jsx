import { fetchSeries } from '@apis/seriesApi';
import Footer from '@components/common/Footer';
import BasicHeader from '@components/header/BasicHeader';
import SeriesDetail from '@components/series/SeriesDetail';
import {
  Button,
  Muted,
  SeriesPageLayout,
} from '@components/series/seriesStyles';
import { useAuth } from '@contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useParams } from 'react-router-dom';

import { POST_EDITOR_ENABLED } from '@/config';

export default function SeriesPage() {
  const { seriesId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => fetchSeries(seriesId),
    retry: false,
  });
  const series = query.data;
  return (
    <>
      <Helmet>
        <title>
          {series ? `${series.title} | Unblind` : '시리즈 | Unblind'}
        </title>
        {series && <meta name="description" content={series.description} />}
      </Helmet>
      <BasicHeader />
      <SeriesPageLayout>
        {location.state?.notice && (
          <Muted role="status">{location.state.notice}</Muted>
        )}
        {series ? (
          <SeriesDetail
            series={series}
            canEdit={POST_EDITOR_ENABLED && user?.id === series.author?.id}
          />
        ) : query.isPending ? (
          <Muted role="status">시리즈를 불러오는 중…</Muted>
        ) : (
          <>
            <h1>
              {query.error?.response?.status === 404
                ? '시리즈를 찾을 수 없습니다'
                : '시리즈를 불러오지 못했습니다'}
            </h1>
            <Muted>공개된 글이 없거나 현재 볼 수 없는 시리즈입니다.</Muted>
            <Button onClick={() => query.refetch()}>다시 시도</Button>{' '}
            <Button as={Link} to="/posts">
              글 목록으로
            </Button>
          </>
        )}
      </SeriesPageLayout>
      <Footer />
    </>
  );
}
