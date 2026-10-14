// Tags are typed as one comma-separated line; a leading # is dropped since the UI never shows one.
export function parseTags(text) {
  const seen = new Set();
  return text
    .split(',')
    .map((tag) => tag.trim().replace(/^#+/, '').trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// The server's limits, counted after the same cleanup parseTags does. Length is in
// UTF-16 units to match Java's String.length(), so an emoji counts as two.
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

export function tagLimitError(text) {
  const tags = parseTags(text ?? '');
  if (tags.length > MAX_TAGS) {
    return `태그는 ${MAX_TAGS}개까지 쓸 수 있습니다(지금 ${tags.length}개).`;
  }
  const long = tags.find((tag) => tag.length > MAX_TAG_LENGTH);
  return long ? `태그는 ${MAX_TAG_LENGTH}자까지 쓸 수 있습니다: ${long}` : null;
}

export function formatTags(tags) {
  return normalizeTags(tags).join(', ');
}

// The API may omit tags or send junk; only non-empty strings are rendered.
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag) => typeof tag === 'string' && tag.trim() !== '');
}
