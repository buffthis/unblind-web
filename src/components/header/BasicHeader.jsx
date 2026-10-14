import Logo from '@components/common/Logo';
import ProfileSection from '@components/header/ProfileSection';
import WriteButton from '@components/header/WriteButton';
import SearchButton from '@components/search/SearchButton';
import useAtPageTop from '@hooks/useAtPageTop';
import useProfileDropdown from '@hooks/useProfileDropdown';
import {
  FixedHeaderArea,
  HeaderContainer,
  HeaderSide,
  HeaderSpacer,
  LogoLink,
  NavMenu,
  NavRouterLink,
} from '@styles/layout/HeaderStyles';
import React from 'react';

function BasicHeader() {
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
          <HeaderSide $justify="flex-start">
            <NavMenu aria-label="주요 페이지">
              <NavRouterLink to="/users">Users</NavRouterLink>
              <NavRouterLink to="/posts">Posts</NavRouterLink>
            </NavMenu>
          </HeaderSide>
          <HeaderSide $justify="center">
            <LogoLink to="/" aria-label="홈으로">
              <Logo variant="black" size={24} />
            </LogoLink>
          </HeaderSide>
          <HeaderSide $justify="flex-end">
            <WriteButton />
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

export default BasicHeader;
