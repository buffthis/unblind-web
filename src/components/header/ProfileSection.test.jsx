import theme from '@styles/theme/theme';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';

import ProfileSection from './ProfileSection';

function renderSection(user) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <ProfileSection
          user={user}
          loading={false}
          isDropdownOpen={false}
          dropdownRef={{ current: null }}
          onProfileClick={vi.fn()}
          onMyPage={vi.fn()}
          onLogout={vi.fn()}
          onWrite={vi.fn()}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('ProfileSection', () => {
  it('draws the profile photo of the header with a 0.75px border', () => {
    renderSection({ profileImage: { url: 'https://example.com/me.png' } });

    const avatar = screen.getByRole('button', {
      name: '프로필 메뉴',
    }).firstElementChild;
    expect(avatar).toHaveStyle({ borderWidth: '0.75px' });
  });

  it('draws the default avatar with the same border without a photo', () => {
    renderSection({ profileImage: { url: '' } });

    const avatar = screen.getByRole('button', {
      name: '프로필 메뉴',
    }).firstElementChild;
    expect(avatar).toHaveStyle({ borderWidth: '0.75px' });
  });
});
