// Raw HTML is never rendered as markup, so a top-level HTML block would reach the
// page as a bare text node. Turning it into a paragraph of plain text gives it the
// same spacing and scroll reveal as every other block. HTML inside a paragraph is
// already wrapped and is left alone.
export default function remarkHtmlAsText() {
  return (tree) => {
    tree.children = tree.children.map((node) =>
      node.type === 'html'
        ? {
            type: 'paragraph',
            children: [{ type: 'text', value: node.value }],
            position: node.position,
          }
        : node
    );
  };
}
