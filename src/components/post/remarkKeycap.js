// A keycap emoji (1️⃣, #️⃣, *️⃣) is a digit, # or * followed by U+FE0F and U+20E3. Each one
// becomes <span class="keycap" role="img" aria-label="1️⃣">1</span>, which the stylesheet draws
// as a number in a square. The emoji font of each platform draws keycaps differently and
// its colors cannot be changed, so the square is plain CSS. Code spans and math hold their
// text in `value`, so they are never read.

// The capture group makes split() keep the keycaps, at the odd indexes of its result.
const KEYCAP = /([0-9#*]️?⃣)/;

function keycapNode(emoji) {
  return {
    type: 'keycap',
    data: {
      hName: 'span',
      hProperties: { className: ['keycap'], role: 'img', ariaLabel: emoji },
    },
    children: [{ type: 'text', value: emoji[0] }],
  };
}

function wrapKeycaps(children) {
  return children.flatMap((node) => {
    if (node.type !== 'text') return [node];
    const parts = node.value.split(KEYCAP);
    if (parts.length === 1) return [node];
    return parts.flatMap((part, index) => {
      if (!part) return [];
      return index % 2 === 0
        ? [{ type: 'text', value: part }]
        : [keycapNode(part)];
    });
  });
}

function walk(node) {
  // The text inside a keycap is the keycap itself; walking it would wrap it again forever.
  if (!node.children || node.type === 'keycap') return;
  node.children = wrapKeycaps(node.children);
  node.children.forEach(walk);
}

export default function remarkKeycap() {
  return walk;
}
