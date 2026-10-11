const CHARS_PER_MINUTE = 500;
const FENCED_CODE = /```[\s\S]*?```/g;

// 500 characters per minute is an assumed rate for Korean prose, not a measured one.
// Code blocks are skipped because readers scan them at a very different pace.
export function estimateReadingMinutes(markdown) {
  if (typeof markdown !== 'string') return 1;
  const chars = markdown.replace(FENCED_CODE, '').replace(/\s/g, '').length;
  return Math.max(1, Math.ceil(chars / CHARS_PER_MINUTE));
}
