import theme from '@styles/theme/theme';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';

import ProfileDropdown from './ProfileDropdown';

function renderDropdown(props) {
  return render(
    <ThemeProvider theme={theme}>
      <ProfileDropdown onMyPage={vi.fn()} onLogout={vi.fn()} {...props} />
    </ThemeProvider>
  );
}

describe('ProfileDropdown', () => {
  it('hides the write item without a handler', () => {
    renderDropdown({});
    expect(
      screen.queryByRole('menuitem', { name: '글쓰기' })
    ).not.toBeInTheDocument();
  });

  it('calls onWrite from the write item', () => {
    const onWrite = vi.fn();
    renderDropdown({ onWrite });
    fireEvent.click(screen.getByRole('menuitem', { name: '글쓰기' }));
    expect(onWrite).toHaveBeenCalled();
  });
});
