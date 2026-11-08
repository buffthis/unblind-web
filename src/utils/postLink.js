import { SITE_URL } from '@/config';

// Only our post pages can become cards. Search parameters and anchors do not
// change the referenced post; external hosts and editor routes are rejected.
export function parsePostLink(source, origin = window.location.origin) {
  if (typeof source !== 'string' || !source.trim()) return null;
  const text = source.trim();
  if (/\s/.test(text)) return null;
  if (!text.startsWith('/') && !/^https?:\/\//i.test(text)) return null;
  try {
    const url = new URL(text, origin);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (
      ![origin, SITE_URL].includes(url.origin) ||
      url.username ||
      url.password
    )
      return null;
    const match = /^\/posts\/([1-9]\d*)\/?$/.exec(url.pathname);
    return match ? { id: match[1], href: `/posts/${match[1]}` } : null;
  } catch {
    return null;
  }
}

export function insertPostLink(content, start, end, href) {
  const before = content.slice(0, start);
  const after = content.slice(end);
  const block = `\`\`\`post\n${href}\n\`\`\``;
  const trailingLines = before.match(/\n*$/)[0].length;
  const leadingLines = after.match(/^\n*/)[0].length;
  const prefix = before
    ? before + '\n'.repeat(Math.max(0, 2 - trailingLines))
    : '';
  const suffix = '\n'.repeat(Math.max(0, 2 - leadingLines)) + after;
  const text = `${prefix}${block}${suffix}`;
  return { text, cursor: prefix.length + block.length + 2 };
}
