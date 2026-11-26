import { render, screen, waitFor } from '@testing-library/react';
import { stashPendingReturnTo } from '@utils/returnTo';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@apis/authApi', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('@apis/userApi', () => ({ fetchUserById: vi.fn() }));

const { fetchMe } = await import('@apis/authApi');
const { fetchUserById } = await import('@apis/userApi');

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/users" element={<div>목록</div>} />
          <Route path="/posts/:postId/edit" element={<div>편집기</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('AuthProvider의 로그인 후 복귀', () => {
  beforeEach(() => {
    vi.mocked(fetchMe).mockReset();
    vi.mocked(fetchUserById).mockReset();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('로그인 상태로 돌아오면 저장된 경로로 이동한다', async () => {
    vi.mocked(fetchMe).mockResolvedValue({ id: 1 });
    vi.mocked(fetchUserById).mockResolvedValue({ id: 1 });
    stashPendingReturnTo('/posts/1/edit');

    renderAt('/users');

    expect(await screen.findByText('편집기')).toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('비로그인 상태면 이동하지 않고 저장값만 지운다', async () => {
    vi.mocked(fetchMe).mockResolvedValue(null);
    stashPendingReturnTo('/posts/1/edit');

    renderAt('/users');

    await waitFor(() => expect(fetchMe).toHaveBeenCalled());
    expect(screen.getByText('목록')).toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('복원 여부가 정해질 때까지 restoringReturnTo가 true다', async () => {
    vi.mocked(fetchMe).mockResolvedValue({ id: 1 });
    vi.mocked(fetchUserById).mockResolvedValue({ id: 1 });
    stashPendingReturnTo('/posts/1/edit');
    const seen = [];
    function Probe() {
      seen.push(useAuth().restoringReturnTo);
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(seen.at(-1)).toBe(false));
    expect(seen[0]).toBe(true);
  });

  it('저장된 경로가 없으면 처음부터 restoringReturnTo가 false다', async () => {
    vi.mocked(fetchMe).mockResolvedValue(null);
    const seen = [];
    function Probe() {
      seen.push(useAuth().restoringReturnTo);
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(fetchMe).toHaveBeenCalled());
    expect(seen.every((v) => v === false)).toBe(true);
  });
});
