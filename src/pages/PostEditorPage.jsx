import { fetchEditablePost } from '@apis/postApi';
import Loading from '@components/common/Loading';
import BasicHeader from '@components/header/BasicHeader';
import PostEditorForm from '@components/post/PostEditorForm';
import { useAuth } from '@contexts/AuthContext';
import { draftKey } from '@hooks/usePostDraft';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';

const EMPTY_VALUES = { title: '', subtitle: '', thumbnailUrl: '', content: '' };

const Message = styled.div`
  padding: 160px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.secondary};

  h2 {
    margin-bottom: 12px;
    font-weight: 400;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Notice = styled.p`
  max-width: 1280px;
  margin: 16px auto 0;
  padding: 0 20px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

function toFormValues(post) {
  return {
    title: post.title || '',
    subtitle: post.subtitle || '',
    thumbnailUrl: post.thumbnail?.url || '',
    content: post.content || '',
  };
}

export default function PostEditorPage() {
  const { postId } = useParams();
  const isEdit = postId != null;
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const {
    data: post,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['post-edit', postId],
    queryFn: () => fetchEditablePost(postId),
    enabled: isEdit && Boolean(user),
    retry: false,
  });

  if (authLoading) return <Loading />;
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  let body;
  if (!isEdit) {
    body = (
      <PostEditorForm
        postId={null}
        initialValues={EMPTY_VALUES}
        draftStorageKey={draftKey(null)}
      />
    );
  } else if (isPending) {
    return <Loading />;
  } else if (isError || !post) {
    body = (
      <Message>
        <h2>글을 불러올 수 없습니다</h2>
        <p>존재하지 않거나 수정 권한이 없는 글입니다.</p>
      </Message>
    );
  } else if (post.author?.id !== user.id) {
    // Display-only guard; the backend's 403/404 is what actually protects the post.
    body = (
      <Message>
        <h2>이 글을 수정할 권한이 없습니다.</h2>
      </Message>
    );
  } else {
    body = (
      <PostEditorForm
        key={post.id}
        postId={post.id}
        initialValues={toFormValues(post)}
        initialThumbnailUrl={post.thumbnail?.url}
        draftStorageKey={draftKey(post.id)}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${isEdit ? '글 수정' : '새 글'} | Unblind`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <BasicHeader />
      {location.state?.notice && (
        <Notice role="status">{location.state.notice}</Notice>
      )}
      {body}
    </>
  );
}
