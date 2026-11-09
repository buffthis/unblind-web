import { deleteSeries, saveSeries } from '@apis/seriesApi';
import useUnsavedChangesWarning from '@hooks/useUnsavedChangesWarning';
import { moveSeriesPost, seriesError } from '@utils/series';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';

import {
  Actions,
  Button,
  Description,
  Eyebrow,
  Muted,
  SeriesForm,
  SeriesTitle,
} from './seriesStyles';

const Ordered = styled.ol`
  list-style: none;
  margin-top: 16px;
  padding: 0;
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.inkSurface};
  }
`;
const ChapterTitle = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  overflow-wrap: anywhere;
  span {
    display: block;
    font-size: 11px;
    color: ${({ theme }) => theme.colors.inkSoft};
    margin-top: 3px;
  }
`;
const Number = styled.span`
  width: 24px;
  flex-shrink: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-variant-numeric: tabular-nums;
`;
const SmallButton = styled(Button)`
  min-height: 36px;
  padding: 6px 10px;
`;
const Candidates = styled.div`
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
  button {
    width: 100%;
    border: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.inkSurface};
    background: none;
    font: inherit;
    font-size: 13px;
    text-align: left;
    padding: 14px 8px;
    color: inherit;
    cursor: pointer;
  }
  button:hover {
    background: ${({ theme }) => theme.colors.inkSurface};
  }
`;
const Confirm = styled.div`
  margin-top: 24px;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  h2 {
    margin: 0;
    font-size: 15px;
  }
`;

export default function SeriesEditorForm({
  series,
  candidates = [],
  onSaved,
  onDeleted,
  onReload,
  postsLoading,
  postsError,
  onRetryPosts,
}) {
  const initial = series || {
    title: '',
    description: '',
    color: 'slate',
    posts: [],
  };
  const [values, setValues] = useState(initial);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const savingRef = useRef(false);
  useUnsavedChangesWarning(dirty);
  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };
  const ids = new Set(values.posts.map((post) => String(post.id)));
  const matches = candidates.filter(
    (post) =>
      !ids.has(String(post.id)) &&
      (!post.series || String(post.series.id) === String(series?.id)) &&
      post.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );

  const save = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    setError('');
    let saved;
    try {
      saved = await saveSeries({ seriesId: series?.id, values });
    } catch (err) {
      setError(seriesError(err));
      setBusy(false);
      savingRef.current = false;
      return;
    }
    setDirty(false);
    try {
      await onSaved(saved);
    } finally {
      setBusy(false);
      savingRef.current = false;
    }
  };
  const removeSeries = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    setError('');
    try {
      await deleteSeries(series.id);
    } catch (err) {
      setError(seriesError(err));
      setBusy(false);
      savingRef.current = false;
      return;
    }
    setDirty(false);
    try {
      await onDeleted();
    } finally {
      setBusy(false);
      savingRef.current = false;
    }
  };
  return (
    <>
      <Eyebrow>YOUR SERIES</Eyebrow>
      <SeriesTitle>{series ? '시리즈 관리' : '새 시리즈'}</SeriesTitle>
      <Description>이어지는 생각을 하나의 흐름으로 묶어 보세요.</Description>
      <SeriesForm onSubmit={save}>
        <fieldset disabled={busy}>
          <label htmlFor="series-title">시리즈 이름</label>
          <input
            id="series-title"
            value={values.title}
            maxLength={80}
            required
            onChange={(event) => update('title', event.target.value)}
            placeholder="예: 작은 서비스가 성장하는 과정"
          />
          <label htmlFor="series-description">
            소개 <span>(선택)</span>
          </label>
          <textarea
            id="series-description"
            value={values.description}
            maxLength={500}
            onChange={(event) => update('description', event.target.value)}
            placeholder="어떤 이야기를 누구에게 들려주고 싶나요?"
          />
          <label htmlFor="series-color">표지 색상</label>
          <select
            id="series-color"
            value={values.color}
            onChange={(event) => update('color', event.target.value)}
          >
            <option value="slate">슬레이트</option>
            <option value="sage">세이지</option>
            <option value="sand">샌드</option>
          </select>
          <h2>
            회차 구성 <span>· {values.posts.length}</span>
          </h2>
          <Muted>
            위에서 아래로 읽는 순서입니다. 숨긴 글은 독자의 목록과 회차 수에
            포함되지 않습니다.
          </Muted>
          {values.posts.length ? (
            <Ordered aria-label="시리즈 글 순서">
              {values.posts.map((post, index) => (
                <li key={post.id}>
                  <Number>{String(index + 1).padStart(2, '0')}</Number>
                  <ChapterTitle>
                    {post.title}
                    {post.hidden && <span>숨긴 글 · 나에게만 표시</span>}
                  </ChapterTitle>
                  <SmallButton
                    type="button"
                    disabled={index === 0}
                    aria-label={`${post.title} 위로 이동`}
                    onClick={() => {
                      update('posts', moveSeriesPost(values.posts, index, -1));
                      setAnnouncement(
                        `${post.title}: ${index}번째로 이동했습니다.`
                      );
                    }}
                  >
                    ↑
                  </SmallButton>
                  <SmallButton
                    type="button"
                    disabled={index === values.posts.length - 1}
                    aria-label={`${post.title} 아래로 이동`}
                    onClick={() => {
                      update('posts', moveSeriesPost(values.posts, index, 1));
                      setAnnouncement(
                        `${post.title}: ${index + 2}번째로 이동했습니다.`
                      );
                    }}
                  >
                    ↓
                  </SmallButton>
                  <SmallButton
                    type="button"
                    aria-label={`${post.title} 시리즈에서 제외`}
                    onClick={() => {
                      update(
                        'posts',
                        values.posts.filter((item) => item.id !== post.id)
                      );
                      setAnnouncement(
                        `${post.title}을 시리즈에서 제외했습니다. 저장하면 반영됩니다.`
                      );
                    }}
                  >
                    빼기
                  </SmallButton>
                </li>
              ))}
            </Ordered>
          ) : (
            <Muted>
              글을 추가하면 이곳에 목차가 만들어집니다. 글 없이 시리즈를 먼저
              만들 수도 있습니다.
            </Muted>
          )}
          <Muted role="status" aria-live="polite">
            {announcement}
          </Muted>
          <label htmlFor="series-post-search">기존 글 추가</label>
          <input
            id="series-post-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="내 글 제목으로 검색"
          />
          {postsLoading ? (
            <Muted role="status">글을 불러오는 중…</Muted>
          ) : postsError ? (
            <>
              <Muted role="alert">글 목록을 불러오지 못했습니다.</Muted>
              <Button type="button" onClick={onRetryPosts}>
                다시 시도
              </Button>
            </>
          ) : (
            <Candidates aria-label="추가할 수 있는 글">
              {matches.length ? (
                matches.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    disabled={values.posts.length >= 200}
                    onClick={() => {
                      update('posts', [...values.posts, post]);
                      setAnnouncement(
                        `${post.title}을 마지막 회차에 추가했습니다.`
                      );
                    }}
                  >
                    + {post.title}
                    {post.hidden ? ' · 숨긴 글' : ''}
                  </button>
                ))
              ) : (
                <Muted>
                  추가할 글이 없습니다. 다른 시리즈에 속한 글은 글 편집기에서
                  이동할 수 있습니다.
                </Muted>
              )}
            </Candidates>
          )}
          <Actions>
            <Button
              $primary
              type="submit"
              disabled={!values.title.trim() || values.posts.length > 200}
            >
              {busy ? '저장 중…' : '시리즈 저장'}
            </Button>
            {series && (
              <Button type="button" onClick={() => setConfirmDelete(true)}>
                시리즈 삭제
              </Button>
            )}
          </Actions>
        </fieldset>
      </SeriesForm>
      {error && (
        <div role="alert">
          <Muted>{error}</Muted>
          {onReload && (
            <Button onClick={onReload} disabled={busy}>
              입력한 변경을 버리고 다시 불러오기
            </Button>
          )}
        </div>
      )}
      {confirmDelete && (
        <Confirm role="region" aria-label="시리즈 삭제 확인">
          <h2>시리즈를 삭제할까요?</h2>
          <Muted>
            시리즈의 소개와 글 묶음이 삭제됩니다. 포함된 글은 삭제되지 않습니다.
          </Muted>
          <Actions>
            <Button onClick={removeSeries} disabled={busy}>
              시리즈만 삭제
            </Button>
            <Button onClick={() => setConfirmDelete(false)} disabled={busy}>
              취소
            </Button>
          </Actions>
        </Confirm>
      )}
    </>
  );
}
