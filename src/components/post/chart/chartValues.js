// Value labels are set in the 12px chart font. A glyph of a wide script takes about its
// font size, anything else about half of it; the estimate only has to be good enough to
// tell labels that clearly collide from labels that clearly do not.
const LABEL_FONT = 12;
const NARROW_GLYPH = 6.5;
const WIDE_FROM = 0x2e80;

const textWidth = (text) =>
  Array.from(text).reduce(
    (sum, char) =>
      sum + (char.codePointAt(0) >= WIDE_FROM ? LABEL_FONT : NARROW_GLYPH),
    0
  );

// Labels sit centred on their marks, so they collide when the widest one is wider than
// the distance between neighbouring marks. One chart shows all of its labels or none,
// so the labels that stay never look like a pick of the data.
export function valuesFit(texts, spacing) {
  return Math.max(0, ...texts.map(textWidth)) <= spacing;
}
