import React from 'react';
import { FiLogIn } from 'react-icons/fi';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const LoginLink = styled(RouterLink)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: transparent;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    background-color: rgba(0, 0, 0, 0.06);
  }
`;

// Carries the current page as returnTo so login lands back where the user started.
function loginPathFrom(location) {
  const current = location.pathname + location.search + location.hash;
  if (location.pathname === '/' || location.pathname === '/login') {
    return '/login';
  }
  return `/login?returnTo=${encodeURIComponent(current)}`;
}

export default function LoginButton() {
  const location = useLocation();
  return (
    <LoginLink to={loginPathFrom(location)} aria-label="로그인">
      <FiLogIn size={18} color="#333333" strokeWidth={2} />
    </LoginLink>
  );
}
