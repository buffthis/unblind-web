import { fetchMySeries, saveSeries } from '@apis/seriesApi';
import { useAuth } from '@contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { seriesError } from '@utils/series';
import React, { useState } from 'react';
import styled from 'styled-components';

import { Actions, Button, Muted } from './seriesStyles';

const Section = styled.section`
  margin: 24px 0;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.ink};
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
  }
  input,
  select {
    width: 100%;
    padding: 10px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    background: ${({ theme }) => theme.colors.background};
    color: inherit;
    font: inherit;
    font-size: 13px;
  }
  input:focus-visible,
  select:focus-visible,
  button:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 3px;
  }
`;

export default function SeriesPicker({
  value,
  currentSeries,
  onChange,
  disabled,
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['series-list', 'mine', user?.id],
    queryFn: fetchMySeries,
    enabled: Boolean(user),
    retry: false,
  });
  const list = query.data || [];
  const selected = list.find((series) => String(series.id) === String(value));
  const create = async () => {
    if (busy || !title.trim()) return;
    setBusy(true);
    setError('');
    try {
      const series = await saveSeries({
        values: { title, description: '', color: 'slate', posts: [] },
      });
      client.setQueryData(['series-list', 'mine', user?.id], (old = []) => [
        ...old,
        { ...series, postCount: 0 },
      ]);
      onChange(series.id);
      setCreating(false);
      setTitle('');
    } catch (err) {
      setError(seriesError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section aria-label="시리즈 설정">
      <label htmlFor="post-series">시리즈</label>
      <select
        id="post-series"
        value={value ?? ''}
        disabled={disabled || busy || query.isPending || query.isError}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">시리즈 없음</option>
        {value != null && !selected && (
          <option value={value}>
            {currentSeries?.title || '선택한 시리즈'}
          </option>
        )}
        {list.map((series) => (
          <option key={series.id} value={series.id}>
            {series.title}
          </option>
        ))}
      </select>
      {query.isPending ? (
        <Muted role="status">내 시리즈를 불러오는 중…</Muted>
      ) : query.isError ? (
        <>
          <Muted role="alert">
            시리즈 목록을 불러오지 못했습니다. 현재 설정은 유지됩니다.
          </Muted>
          <Button
            type="button"
            onClick={() => query.refetch()}
            disabled={disabled}
          >
            다시 시도
          </Button>
        </>
      ) : (
        <Muted>
          {value != null
            ? String(value) === String(currentSeries?.id)
              ? '현재 회차 순서를 유지합니다.'
              : '저장하면 이 시리즈의 마지막 회차에 추가됩니다.'
            : '이 글을 하나의 시리즈에 묶을 수 있습니다.'}
        </Muted>
      )}
      {creating ? (
        <>
          <label htmlFor="new-series-title">새 시리즈 이름</label>
          <input
            id="new-series-title"
            maxLength={80}
            value={title}
            disabled={disabled || busy}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Actions>
            <Button
              type="button"
              onClick={create}
              disabled={disabled || busy || !title.trim()}
            >
              {busy ? '만드는 중…' : '만들고 선택'}
            </Button>
            <Button
              type="button"
              onClick={() => setCreating(false)}
              disabled={disabled || busy}
            >
              취소
            </Button>
          </Actions>
        </>
      ) : (
        <Button
          type="button"
          onClick={() => setCreating(true)}
          disabled={disabled || busy}
        >
          새 시리즈 만들기 +
        </Button>
      )}
      {error && <Muted role="alert">{error}</Muted>}
    </Section>
  );
}
