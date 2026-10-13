import styled from 'styled-components';

// Shown under a chart or tree block whose source does not parse.
// && beats PostArticle's `p` margin so the note sits right under the code block.
const BlockErrorNote = styled.p`
  && {
    margin: -12px 0 20px;
    font-size: 0.85rem;
    color: #d93025;
  }
`;

export default BlockErrorNote;
