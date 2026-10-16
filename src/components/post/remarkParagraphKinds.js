// Marks a paragraph that holds one image and nothing else with data-image, so the
// styles can give the image the same empty space above and below as a line of text.
// A paragraph that mixes text and an image, or holds several images, is left alone.
// Only paragraphs directly under the page are looked at, not the ones in quotes or lists.
const isBlankText = (node) => node.type === 'text' && node.value.trim() === '';

function holdsOnlyOneImage(paragraph) {
  const parts = paragraph.children.filter((child) => !isBlankText(child));
  return parts.length === 1 && parts[0].type === 'image';
}

export default function remarkParagraphKinds() {
  return (tree) => {
    tree.children.forEach((node) => {
      if (node.type !== 'paragraph' || !holdsOnlyOneImage(node)) return;
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, 'data-image': '' },
      };
    });
  };
}
