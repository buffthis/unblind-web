// A thumbnail has no field of its own for a border, so the switch rides on the stored
// address as a trailing "#border". A browser never sends the part after # to the image
// host, so the image loads the same either way.
const BORDER_FLAG = '#border';

export function splitThumbnail(url) {
  const text = typeof url === 'string' ? url : '';
  return text.endsWith(BORDER_FLAG)
    ? { src: text.slice(0, -BORDER_FLAG.length), border: true }
    : { src: text, border: false };
}

// An empty address stays empty so a bare flag is never registered as an image.
export function joinThumbnail(src, border = false) {
  return border && src ? `${src}${BORDER_FLAG}` : src;
}
