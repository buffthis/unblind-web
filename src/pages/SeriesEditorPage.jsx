import { fetchSeries, fetchSeriesCandidatePosts } from '@apis/seriesApi';
import BasicHeader from '@components/header/BasicHeader';
import SeriesEditorForm from '@components/series/SeriesEditorForm';
import {
  Button,
  Muted,
  SeriesPageLayout,
} from '@components/series/seriesStyles';
import { useAuth } from '@contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

export default function SeriesEditorPage() {
  const { seriesId } = useParams();
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['series-edit', seriesId],
    queryFn: () => fetchSeries(seriesId, { editable: true }),
    enabled: Boolean(user && seriesId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const posts = useQuery({
    queryKey: ['series-candidates', user?.id],
    queryFn: () => fetchSeriesCandidatePosts(user.id),
    enabled: Boolean(user),
    retry: false,
  });
  const invalidate = () =>
    Promise.all(
      [
        'series',
        'series-list',
        'series-edit',
        'series-candidates',
        'posts',
        'post',
        'post-edit',
        'user',
      ].map((key) => client.invalidateQueries({ queryKey: [key] }))
    );
  if (loading) return <Muted role="status">사용자 정보를 불러오는 중…</Muted>;
  if (!user)
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  const forbidden = query.data && query.data.author?.id !== user.id;
  return (
    <>
      <Helmet>
        <title>{seriesId ? '시리즈 관리' : '새 시리즈'} | Unblind</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <BasicHeader />
      <SeriesPageLayout>
        {location.state?.notice && (
          <Muted role="status">{location.state.notice}</Muted>
        )}
        <Button as={Link} to={`/${user.username}#posts`}>
          ← 내 글로
        </Button>
        {seriesId && query.isPending ? (
          <Muted role="status">시리즈를 불러오는 중…</Muted>
        ) : query.isError || forbidden ? (
          <>
            <Muted role="alert">시리즈가 없거나 수정할 권한이 없습니다.</Muted>
            <Button onClick={() => query.refetch()}>다시 시도</Button>
          </>
        ) : (
          <SeriesEditorForm
            key={seriesId ? `${seriesId}:${query.data.version}` : 'new'}
            series={query.data}
            candidates={posts.data}
            postsLoading={posts.isPending}
            postsError={posts.isError}
            onRetryPosts={() => posts.refetch()}
            onReload={seriesId ? () => query.refetch() : undefined}
            onSaved={async (saved) => {
              await invalidate();
              navigate(
                saved.posts.some((post) => !post.hidden)
                  ? `/series/${saved.id}`
                  : `/series/${saved.id}/edit`,
                { replace: true, state: { notice: '시리즈를 저장했습니다.' } }
              );
            }}
            onDeleted={async () => {
              await invalidate();
              navigate(`/${user.username}#posts`, { replace: true });
            }}
          />
        )}
      </SeriesPageLayout>
    </>
  );
}
