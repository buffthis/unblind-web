import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import LoginButton from './LoginButton';

function hrefAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <LoginButton />
    </MemoryRouter>
  );
  return screen.getByRole('link', { name: '로그인' }).getAttribute('href');
}

describe('LoginButton', () => {
  it('현재 경로를 returnTo로 넘긴다', () => {
    expect(hrefAt('/posts?tag=java')).toBe(
      '/login?returnTo=%2Fposts%3Ftag%3Djava'
    );
  });

  it('루트에서는 returnTo를 붙이지 않는다', () => {
    expect(hrefAt('/')).toBe('/login');
  });
});
