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

export function formatTags(tags) {
  return normalizeTags(tags).join(', ');
}

// The API may omit tags or send junk; only non-empty strings are rendered.
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag) => typeof tag === 'string' && tag.trim() !== '');
}
