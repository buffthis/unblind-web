// A blank line between two blocks is the usual markdown paragraph break. Each blank
// line beyond the first becomes extra space above the second block, up to MAX_EXTRA
// of them, by tagging that block with data-gap="<count>". Before the very first block
// of the page there is no paragraph break to begin with, so every blank line there
// counts. Only the blocks directly under the page, a quote or a list item are looked
// at, so blank lines inside a code block are never counted.
export const MAX_EXTRA = 3;
const BLOCK_PARENTS = new Set(['root', 'blockquote', 'listItem']);

// The blank lines above a block that follow the paragraph break, or all of them for the
// first block of the page.
function extraLines(parent, child, previous) {
  if (!child.position) return 0;
  if (previous) {
    if (!previous.position) return 0;
    const blankLines =
      child.position.start.line - previous.position.end.line - 1;
    return blankLines - 1;
  }
  return parent.type === 'root' ? child.position.start.line - 1 : 0;
}

function tagGaps(node) {
  if (!node.children) return;
  if (BLOCK_PARENTS.has(node.type)) {
    node.children.forEach((child, index) => {
      const extra = Math.min(
        extraLines(node, child, node.children[index - 1]),
        MAX_EXTRA
      );
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
