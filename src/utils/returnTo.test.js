import { afterEach, describe, expect, it } from 'vitest';

import {
  clearPendingReturnTo,
  PENDING_RETURN_TO_TTL_MS,
  sanitizeReturnTo,
  stashPendingReturnTo,
  takePendingReturnTo,
} from './returnTo';

describe('sanitizeReturnTo', () => {
  it('내부 경로는 쿼리와 해시까지 유지한다', () => {
    expect(sanitizeReturnTo('/posts/1?tab=a#h')).toBe('/posts/1?tab=a#h');
  });

  it('외부 URL과 protocol-relative 우회를 거부한다', () => {
    expect(sanitizeReturnTo('https://evil.example')).toBeNull();
    expect(sanitizeReturnTo('//evil.example')).toBeNull();
    expect(sanitizeReturnTo('/\\evil.example')).toBeNull();
    expect(sanitizeReturnTo(null)).toBeNull();
  });
});

describe('pending returnTo', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('저장한 경로를 한 번만 돌려준다', () => {
    stashPendingReturnTo('/posts/1/edit', 1000);
    expect(takePendingReturnTo(2000)).toBe('/posts/1/edit');
    expect(takePendingReturnTo(2000)).toBeNull();
  });

  it('유효 시간이 지난 값은 버린다', () => {
    stashPendingReturnTo('/posts/1/edit', 0);
    expect(takePendingReturnTo(PENDING_RETURN_TO_TTL_MS + 1)).toBeNull();
  });

  it('루트나 외부 경로는 저장하지 않는다', () => {
    stashPendingReturnTo('/', 0);
    expect(takePendingReturnTo(0)).toBeNull();
    stashPendingReturnTo('//evil.example', 0);
    expect(takePendingReturnTo(0)).toBeNull();
  });

  it('저장소가 변조돼도 외부 경로로 보내지 않는다', () => {
    window.sessionStorage.setItem(
      'auth.pendingReturnTo',
      JSON.stringify({ path: '//evil.example', savedAt: 0 })
    );
    expect(takePendingReturnTo(0)).toBeNull();
    window.sessionStorage.setItem('auth.pendingReturnTo', 'not json');
    expect(takePendingReturnTo(0)).toBeNull();
  });

  it('clear는 저장된 값을 지운다', () => {
    stashPendingReturnTo('/posts/1/edit', 0);
    clearPendingReturnTo();
    expect(takePendingReturnTo(0)).toBeNull();
  });
});
