// A single Enter inside a paragraph becomes a line break, as in a chat box or an
// editor, while a blank line still starts a new paragraph. Markdown alone would fold
// the single Enter into a space. Only text nodes are split, so the newlines inside
// code blocks, inline code and math are left as written.
function splitLines(node) {
  const lines = node.value.split('\n');
  if (lines.length === 1) return [node];
  const out = [];
  lines.forEach((line, index) => {
    if (index > 0) out.push({ type: 'break' });
    // Spaces before a line break are noise; the last line keeps its trailing space.
    const text = index < lines.length - 1 ? line.replace(/[ \t]+$/, '') : line;
    if (text) out.push({ type: 'text', value: text });
  });
  return out;
}

function walk(node) {
  if (!node.children) return;
  node.children = node.children.flatMap((child) =>
    child.type === 'text' ? splitLines(child) : [child]
  );
  node.children.forEach(walk);
}

export default function remarkBreaks() {
  return walk;
}
