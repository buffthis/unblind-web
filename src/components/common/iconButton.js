import { css } from 'styled-components';

// The diameter shared by the header's round buttons and the profile photo beside them.
export const HEADER_ICON_SIZE = 30;
// Hairline border, the same as on the profile photo.
export const HEADER_ICON_BORDER = 0.75;

// The round, outlined look of the small icon buttons in the header.
export const iconButton = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: ${HEADER_ICON_SIZE}px;
  height: ${HEADER_ICON_SIZE}px;
  padding: 0;
  border: ${HEADER_ICON_BORDER}px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  color: ${({ theme }) => theme.colors.secondary};
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover,
  &:focus-visible {
    background: rgba(0, 0, 0, 0.05);
  }
`;
