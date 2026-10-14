import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from './App';

vi.mock('@apis/authApi', () => ({
  fetchMe: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@apis/userApi', () => ({
  fetchUserById: vi.fn(),
  fetchUserByUsername: vi.fn(),
  fetchUsersCursor: vi.fn().mockResolvedValue({
    content: [
      {
        id: 1,
        username: 'tester',
        name: '테스터',
        bio: '소개',
        profileImage: { url: '', altText: '' },
        careers: [],
        userType: 'MEMBER',
      },
    ],
    last: true,
  }),
}));

vi.mock('@apis/postApi', () => ({
  fetchPostById: vi.fn(),
  fetchPosts: vi.fn().mockResolvedValue([]),
}));

// Every page is lazy, so the first render waits for the page module to load; under a
// busy full test run that can exceed waitFor's 1s default.
const PAGE_LOAD = { timeout: 5000 };

describe('App', () => {
  it('/ 진입 시 사용자 목록으로 리다이렉트되어 사용자 카드를 렌더링한다', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    await waitFor(
      () => expect(screen.getByText('tester')).toBeInTheDocument(),
      PAGE_LOAD
    );
    expect(screen.getByText('테스터')).toBeInTheDocument();
  });

  it('알 수 없는 다중 세그먼트 경로에는 404 페이지를 렌더링한다', async () => {
    window.history.pushState({}, '', '/no/such/page');
    render(<App />);

    await waitFor(
      () =>
        expect(
          screen.getByText('페이지를 찾을 수 없습니다')
        ).toBeInTheDocument(),
      PAGE_LOAD
    );
  });
});
