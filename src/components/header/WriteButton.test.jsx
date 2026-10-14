import { useAuth } from '@contexts/AuthContext';
import theme from '@styles/theme/theme';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WriteButton from './WriteButton';

vi.mock('@contexts/AuthContext', () => ({ useAuth: vi.fn() }));
const config = vi.hoisted(() => ({ POST_EDITOR_ENABLED: true }));
vi.mock('@/config', async (importOriginal) => ({
  ...(await importOriginal()),
  get POST_EDITOR_ENABLED() {
    return config.POST_EDITOR_ENABLED;
  },
}));

function renderButton(path = '/posts') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <WriteButton />
      </MemoryRouter>
    </ThemeProvider>
  );
}

beforeEach(() => {
  config.POST_EDITOR_ENABLED = true;
  useAuth.mockReturnValue({ user: { id: 7, username: 'tester' } });
});

describe('WriteButton', () => {
  it('links a signed-in writer to the new post page', () => {
    renderButton();
    expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute(
      'href',
      '/posts/new'
    );
  });

  it('is hidden from visitors who are not signed in', () => {
    useAuth.mockReturnValue({ user: null });
    renderButton();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('is hidden while the editor is turned off', () => {
    config.POST_EDITOR_ENABLED = false;
    renderButton();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('is hidden in the editor itself', () => {
    renderButton('/posts/new');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
