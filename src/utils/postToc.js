export const DEFAULT_TOC_MAX_LEVEL = 3;

export function normalizeTocMaxLevel(value) {
  const level = Number(value);
  return [1, 2, 3].includes(level) ? level : DEFAULT_TOC_MAX_LEVEL;
}

// The API stores no separate toc setting. Keep it in a reserved leading comment,
// and separate it at the API boundary so editors and readers see only the body.
const TOC_METADATA = /^<!-- unblind:toc-max-level=([1-3]) -->\r?\n\r?\n/;

export function decodePostToc(post) {
  const match =
    typeof post.content === 'string' && post.content.match(TOC_METADATA);
  if (!match) return post;
  return {
    ...post,
    content: post.content.slice(match[0].length),
    tocMaxLevel: Number(match[1]),
  };
}

export function encodePostToc(content, maxLevel) {
  const level = normalizeTocMaxLevel(maxLevel);
  return level === DEFAULT_TOC_MAX_LEVEL
    ? content
    : `<!-- unblind:toc-max-level=${level} -->\n\n${content}`;
}
