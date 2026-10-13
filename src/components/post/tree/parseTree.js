const MAX_NODES = 200;
const MAX_DEPTH = 8;

class TreeSyntaxError extends Error {
  constructor(line, message) {
    super(message);
    this.line = line;
  }
}

function fail(line, message) {
  throw new TreeSyntaxError(line, message);
}

export function formatTreeError({ line, message }) {
  return `${line}번째 줄: ${message}`;
}

// One label per line; a line indented deeper than the line it follows is a child,
// and siblings share an indent. Blank lines are skipped.
// "Root\n  A\n    A1\n  B" gives Root with children A (which has A1) and B.
function build(source) {
  let root = null;
  let count = 0;
  // Open ancestors of the next line, innermost last.
  const stack = [];
  source.split('\n').forEach((raw, index) => {
    const line = index + 1;
    if (raw.trim() === '') return;
    const leading = raw.match(/^[ \t]*/)[0];
    if (leading.includes('\t'))
      fail(line, '들여쓰기에는 탭 대신 공백을 써 주세요');
    const indent = leading.length;
    const node = { label: raw.trim(), children: [] };
    count += 1;
    if (count > MAX_NODES)
      fail(line, `항목은 ${MAX_NODES}개까지 쓸 수 있습니다`);

    if (!root) {
      if (indent > 0) fail(line, '첫 줄은 들여쓰지 않은 루트여야 합니다');
      root = node;
      stack.push({ indent, node, childIndent: null });
      return;
    }
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (!parent) fail(line, '루트는 하나만 둘 수 있습니다');
    if (parent.childIndent === null) parent.childIndent = indent;
    if (parent.childIndent !== indent) {
      fail(line, '같은 단계의 줄과 들여쓰기가 맞지 않습니다');
    }
    if (stack.length >= MAX_DEPTH)
      fail(line, `단계는 ${MAX_DEPTH}개까지 쓸 수 있습니다`);
    parent.node.children.push(node);
    stack.push({ indent, node, childIndent: null });
  });
  if (!root) fail(1, '항목이 없습니다');
  return root;
}

export function parseTree(source) {
  try {
    return { ok: true, tree: build(source) };
  } catch (error) {
    if (error instanceof TreeSyntaxError) {
      return { ok: false, error: { line: error.line, message: error.message } };
    }
    throw error;
  }
}
