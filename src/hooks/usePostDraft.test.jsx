import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import usePostDraft, { draftKey, readDraft } from './usePostDraft';

const values = {
  title: '제목',
  subtitle: '',
  thumbnailUrl: '',
  content: '본문',
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('draftKey', () => {
  it('separates new and existing posts', () => {
    expect(draftKey(undefined)).toBe('post-draft:new');
    expect(draftKey('3')).toBe('post-draft:3');
  });
});

describe('readDraft', () => {
  it('returns null for missing or corrupt drafts', () => {
    expect(readDraft('post-draft:new')).toBeNull();
    localStorage.setItem('post-draft:new', '{oops');
    expect(readDraft('post-draft:new')).toBeNull();
  });
});

describe('usePostDraft', () => {
  it('saves one second after the last change', () => {
    renderHook(() => usePostDraft('post-draft:new', values, true));

    act(() => vi.advanceTimersByTime(999));
    expect(readDraft('post-draft:new')).toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(readDraft('post-draft:new')).toMatchObject(values);
  });

  it('never writes while disabled, so an existing draft survives', () => {
    localStorage.setItem(
      'post-draft:new',
      JSON.stringify({ ...values, title: '옛 초안' })
    );
    renderHook(() =>
      usePostDraft('post-draft:new', { ...values, title: '' }, false)
    );

    act(() => vi.advanceTimersByTime(5000));
    expect(readDraft('post-draft:new').title).toBe('옛 초안');
  });

  it('flush writes immediately and clear removes the draft', () => {
    const { result } = renderHook(() =>
      usePostDraft('post-draft:3', values, true)
    );

    act(() => result.current.flush());
    expect(readDraft('post-draft:3')).toMatchObject(values);

    act(() => result.current.clear());
    expect(readDraft('post-draft:3')).toBeNull();
  });
});
