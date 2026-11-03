// [[text]] becomes an inline badge: <span class="badge">text</span>. The text can hold an
// emoji, so [[🚧 작성 중]] works. A last "|tone" picks the color, as in [[v2 출시|green]];
// when what follows the last | is not a known tone, the whole inside stays the label.
// Code spans and math hold their text in `value`, so brackets there are never read.

export const BADGE_TONES = ['wip', 'blue', 'green', 'amber', 'red'];

// The capture group makes split() keep the badges, at the odd indexes of its result.
const BADGE = /(\[\[[^[\]\n]+\]\])/;

function parseBadge(source) {
  const inner = source.slice(2, -2);
  const bar = inner.lastIndexOf('|');
  const tone = bar === -1 ? '' : inner.slice(bar + 1).trim();
  const label = BADGE_TONES.includes(tone) ? inner.slice(0, bar) : inner;
  return { label: label.trim(), tone: BADGE_TONES.includes(tone) ? tone : '' };
}

function badgeNode(source) {
  const { label, tone } = parseBadge(source);
  if (!label) return { type: 'text', value: source };
  return {
    type: 'badge',
    data: {
      hName: 'span',
      hProperties: { className: ['badge'], ...(tone && { dataTone: tone }) },
    },
    children: [{ type: 'text', value: label }],
  };
}

function wrapBadges(children) {
  return children.flatMap((node) => {
    if (node.type !== 'text') return [node];
    const parts = node.value.split(BADGE);
    if (parts.length === 1) return [node];
    return parts.flatMap((part, index) => {
      if (!part) return [];
      return index % 2 === 0
        ? [{ type: 'text', value: part }]
        : [badgeNode(part)];
    });
  });
}

function walk(node) {
  // The text inside a badge is its label; walking it would read the label again.
  if (!node.children || node.type === 'badge') return;
  node.children = wrapBadges(node.children);
  node.children.forEach(walk);
}

export default function remarkBadge() {
  return walk;
}
