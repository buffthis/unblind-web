import { LAYOUT } from '@styles/constants';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';

export const FixedHeaderArea = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
`;

export const HeaderSpacer = styled.div`
  padding-top: ${LAYOUT.HEADER_HEIGHT}px;
`;

export const HeaderContainer = styled.header`
  // color
  background-color: rgba(255, 255, 255, 0.9);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-bottom: 0.5px solid ${({ theme }) => theme.colors.border};
  /* The edge fades in slower than the background so it never snaps in once the page moves. */
  transition:
    background-color 200ms ease-out,
    border-bottom-color 600ms ease-out;

  /* At the top the header melts into the page: opaque page color and no edge. */
  ${({ $atTop, theme }) =>
    $atTop &&
    css`
      background-color: ${theme.colors.backgroundLight};
      border-bottom-color: transparent;
    `}

  // size
  width: 100%;
  height: ${LAYOUT.HEADER_HEIGHT}px;

  // layout
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 0 24px;
  position: fixed;
  z-index: 1001;
`;

export const HeaderSide = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  gap: 8px;
`;

export const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
`;

export const NavMenu = styled.nav`
  display: flex;
  align-items: center;
  gap: 36px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 16px;
  }
`;

const navLinkStyle = css`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.7rem;
  font-weight: 300;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  cursor: pointer;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ theme }) => theme.colors.secondary};
  }
`;

export const NavLink = styled.a`
  ${navLinkStyle}
`;

export const NavRouterLink = styled(Link)`
  ${navLinkStyle}
`;
