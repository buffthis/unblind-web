import React from 'react';
import styled from 'styled-components';

const DropdownMenu = styled.div`
  position: absolute;
  top: 50px;
  right: 0;
  background: ${({ theme }) => theme.colors.backgroundLight};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  min-width: 120px;
  z-index: 2000;
  padding: 4px 0;
`;

const MenuItem = styled.button`
  display: block;
  width: 100%;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 300;
  font-size: inherit;
  font-family: inherit;
  color: #222;
  background: none;
  border: none;
  text-align: left;

  &:hover,
  &:focus-visible {
    background: rgba(0, 0, 0, 0.04);
  }
`;

export default function ProfileDropdown({ onMyPage, onLogout, onWrite }) {
  return (
    <DropdownMenu role="menu">
      <MenuItem role="menuitem" onClick={onMyPage}>
        My Page
      </MenuItem>
      {onWrite && (
        <MenuItem role="menuitem" onClick={onWrite}>
          글쓰기
        </MenuItem>
      )}
      <MenuItem role="menuitem" onClick={onLogout}>
        Logout
      </MenuItem>
    </DropdownMenu>
  );
}
