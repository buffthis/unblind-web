import Avatar from '@components/common/Avatar';
import LoginButton from '@components/header/LoginButton';
import ProfileDropdown from '@components/header/ProfileDropdown';
import React from 'react';
import styled from 'styled-components';

const DropdownAnchor = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const AvatarButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`;

const Placeholder = styled.div`
  width: 30px;
  height: 30px;
`;

export default function ProfileSection({
  user,
  loading,
  isDropdownOpen,
  dropdownRef,
  onProfileClick,
  onMyPage,
  onLogout,
  onWrite,
}) {
  if (loading) {
    return <Placeholder />;
  }

  if (!user) {
    return <LoginButton />;
  }

  return (
    <DropdownAnchor ref={dropdownRef}>
      <AvatarButton
        onClick={onProfileClick}
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        aria-label="프로필 메뉴"
      >
        <Avatar src={user.profileImage?.url} size={30} />
      </AvatarButton>
      {isDropdownOpen && (
        <ProfileDropdown
          onMyPage={onMyPage}
          onLogout={onLogout}
          onWrite={onWrite}
        />
      )}
    </DropdownAnchor>
  );
}
