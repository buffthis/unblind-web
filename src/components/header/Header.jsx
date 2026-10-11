import Logo from '@components/common/Logo';
import ProfileSection from '@components/header/ProfileSection';
import SearchButton from '@components/search/SearchButton';
import useAtPageTop from '@hooks/useAtPageTop';
import useProfileDropdown from '@hooks/useProfileDropdown';
import {
  FixedHeaderArea,
  HeaderContainer,
  HeaderSide,
  HeaderSpacer,
  LogoLink,
  NavLink,
  NavMenu,
} from '@styles/layout/HeaderStyles';
import { sectionConfig } from '@utils/sections';
import React from 'react';

function Header({ sectionVisibility }) {
  const atTop = useAtPageTop();
  const {
    user,
    loading,
    isDropdownOpen,
    dropdownRef,
    handleProfileClick,
    handleMyPage,
    handleWrite,
    handleLogout,
  } = useProfileDropdown();

  return (
    <>
      <FixedHeaderArea>
        <HeaderContainer $atTop={atTop}>
          <HeaderSide $justify="flex-end">
            <LogoLink to="/" aria-label="홈으로">
              <Logo variant="black" size={24} />
            </LogoLink>
          </HeaderSide>
          <NavMenu aria-label="페이지 내 섹션">
            {sectionConfig.map(
              (section) =>
                sectionVisibility[section.id] && (
                  <NavLink key={section.id} href={`#${section.id}`}>
                    {section.label}
                  </NavLink>
                )
            )}
          </NavMenu>
          <HeaderSide $justify="flex-start">
            <SearchButton />
            <ProfileSection
              user={user}
              loading={loading}
              isDropdownOpen={isDropdownOpen}
              dropdownRef={dropdownRef}
              onProfileClick={handleProfileClick}
              onMyPage={handleMyPage}
              onLogout={handleLogout}
              onWrite={handleWrite}
            />
          </HeaderSide>
        </HeaderContainer>
      </FixedHeaderArea>
      <HeaderSpacer />
    </>
  );
}

export default Header;
