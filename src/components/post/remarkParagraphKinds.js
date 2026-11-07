// Marks a paragraph that holds one image and nothing else with data-image, so the
// styles can give the image the same empty space above and below as a line of text.
// A paragraph that holds exactly two images and nothing else gets data-images instead,
// and the styles lay the two out side by side. A paragraph that mixes text and an image,
// or holds three or more images, is left alone.
// Only paragraphs directly under the page are looked at, not the ones in quotes or lists.
const isBlankText = (node) => node.type === 'text' && node.value.trim() === '';

function imagesOnly(paragraph) {
  const parts = paragraph.children.filter((child) => !isBlankText(child));
  return parts.every((part) => part.type === 'image') ? parts.length : 0;
}

export default function remarkParagraphKinds() {
  return (tree) => {
    tree.children.forEach((node) => {
      if (node.type !== 'paragraph') return;
      const count = imagesOnly(node);
      const flag =
        count === 1 ? 'data-image' : count === 2 ? 'data-images' : null;
      if (!flag) return;
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, [flag]: '' },
      };
    });
  };
}
