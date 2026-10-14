import { css } from 'styled-components';

// The rounded, outlined look of the small action buttons in the header.
export const pillButton = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 28px;
  min-width: 28px;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
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
