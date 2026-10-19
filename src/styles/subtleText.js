import { css } from 'styled-components';

// The light small text of a post: the job under the author name, and the date on the
// post page. With the name's 16.5px line, the 16px line keeps the two
// lines about 5.5px apart.
const subtleText = css`
  font-size: 12.6px;
  font-weight: 300;
  letter-spacing: 0.02em;
  line-height: 16px;
  color: ${({ theme }) => theme.colors.inkMuted};
`;

export default subtleText;
