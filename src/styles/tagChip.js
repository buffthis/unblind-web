import { css } from 'styled-components';

// A tag of a post, on the post page under its title and on its card.
export const TAG_LINE_HEIGHT = 19;

const tagChip = css`
  padding: 0 7px;
  border-radius: 5px;
  background: ${({ theme }) => theme.colors.inkSurface};
  font-size: 11px;
  font-weight: 460;
  line-height: ${TAG_LINE_HEIGHT}px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

export default tagChip;
