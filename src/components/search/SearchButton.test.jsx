import { useSearch } from '@components/search/SearchProvider';
import theme from '@styles/theme/theme';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SearchButton from './SearchButton';

vi.mock('@components/search/SearchProvider', () => ({ useSearch: vi.fn() }));

const open = vi.fn();

beforeEach(() => {
  open.mockReset();
  useSearch.mockReturnValue({ open });
});

function renderButton() {
  return render(
    <ThemeProvider theme={theme}>
      <SearchButton />
    </ThemeProvider>
  );
}

describe('SearchButton', () => {
  it('shows only the magnifier, without the shortcut label', () => {
    renderButton();

    const button = screen.getByRole('button', { name: '검색 열기' });
    expect(button).toHaveTextContent('');
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('opens the search when pressed', () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: '검색 열기' }));
    expect(open).toHaveBeenCalledTimes(1);
  });
});
