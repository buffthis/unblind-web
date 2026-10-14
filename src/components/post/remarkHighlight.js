// ==text== becomes <mark>. Markers are paired across the children of one parent,
// so a highlight can wrap **bold**, `code` or links as well as sit inside them.
// Code spans and math hold their text in `value`, so their equals signs are never read.

const MARKER = /==/g;
const isWordChar = (char) => char !== undefined && !/\s/.test(char);

// The character on either side of a marker, looking into the neighbouring sibling
// when the marker sits at the edge of its text node. Any non-text sibling counts
// as a word character because it renders something visible.
function charBefore(children, { index, pos }) {
  if (pos > 0) return children[index].value[pos - 1];
  const prev = children[index - 1];
  if (!prev) return undefined;
  return prev.type === 'text' ? prev.value.at(-1) : 'x';
}

function charAfter(children, { index, pos }) {
  const { value } = children[index];
  if (pos + 2 < value.length) return value[pos + 2];
  const next = children[index + 1];
  if (!next) return undefined;
  return next.type === 'text' ? next.value[0] : 'x';
}

// A marker opens when a word follows it and closes when a word precedes it, so
// "a == b == c" stays as text. A later opener replaces an unclosed one.
function pairMarkers(children) {
  const markers = [];
  children.forEach((node, index) => {
    if (node.type !== 'text') return;
    for (const match of node.value.matchAll(MARKER)) {
      markers.push({ index, pos: match.index });
    }
  });

  const pairs = [];
  let open = null;
  for (const marker of markers) {
    const empty =
      open && open.index === marker.index && open.pos + 2 === marker.pos;
    if (open && !empty && isWordChar(charBefore(children, marker))) {
      pairs.push(open, marker);
      open = null;
    } else if (isWordChar(charAfter(children, marker))) {
      open = marker;
    }
  }
  return pairs;
}

function highlightChildren(children) {
  const paired = pairMarkers(children);
  if (paired.length === 0) return children;

  const out = [];
  let mark = null;
  const push = (node) => (mark ? mark.children : out).push(node);
  const pushText = (value) => value && push({ type: 'text', value });

  children.forEach((node, index) => {
    const cuts = paired.filter((marker) => marker.index === index);
    if (cuts.length === 0) {
      push(node);
      return;
    }
    let from = 0;
    for (const { pos } of cuts) {
      pushText(node.value.slice(from, pos));
      if (mark) {
        out.push(mark);
        mark = null;
      } else {
        mark = { type: 'highlight', data: { hName: 'mark' }, children: [] };
      }
      from = pos + 2;
    }
    pushText(node.value.slice(from));
  });
  return out;
}

function walk(node) {
  if (!node.children) return;
  node.children = highlightChildren(node.children);
  node.children.forEach(walk);
}

export default function remarkHighlight() {
  return walk;
}
