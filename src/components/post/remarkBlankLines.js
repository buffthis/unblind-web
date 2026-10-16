// A blank line between two blocks is the usual markdown paragraph break. Each blank
// line beyond the first becomes extra space above the second block, up to MAX_EXTRA
// of them, by tagging that block with data-gap="<count>". Only the blocks directly
// under the page, a quote or a list item are looked at, so blank lines inside a code
// block are never counted.
export const MAX_EXTRA = 3;
const BLOCK_PARENTS = new Set(['root', 'blockquote', 'listItem']);

function tagGaps(node) {
  if (!node.children) return;
  if (BLOCK_PARENTS.has(node.type)) {
    node.children.forEach((child, index) => {
      const previous = node.children[index - 1];
      if (!previous?.position || !child.position) return;
      const blankLines =
        child.position.start.line - previous.position.end.line - 1;
      const extra = Math.min(blankLines - 1, MAX_EXTRA);
      if (extra < 1) return;
      child.data = {
        ...child.data,
        hProperties: { ...child.data?.hProperties, 'data-gap': String(extra) },
      };
    });
  }
  node.children.forEach(tagGaps);
}

export default function remarkBlankLines() {
  return tagGaps;
}
