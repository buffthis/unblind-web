// Lines are drawn in a fixed 0..1000 box stretched to the plot, so resizing never
// recomputes coordinates (the stroke stays 2.5px via non-scaling-stroke).
export const VIEW = 1000;
export const CLIP_PAD = 20;
export const CLIP_FULL = VIEW + CLIP_PAD * 2;

export function xAt(index, count) {
  return count <= 1 ? 0 : (index / (count - 1)) * VIEW;
}

function yAt(value, domain) {
  return VIEW - ((value - domain.min) / (domain.max - domain.min)) * VIEW;
}

export function toPoints(values, domain) {
  return values
    .map(
      (value, index) =>
        `${xAt(index, values.length).toFixed(2)} ${yAt(value, domain).toFixed(2)}`
    )
    .join(' ');
}

export function indexFromRatio(ratio, count) {
  return Math.round(Math.min(1, Math.max(0, ratio)) * (count - 1));
}

export function valueAt(values, position) {
  const last = values.length - 1;
  if (position >= last) return values[last];
  if (position <= 0) return values[0];
  const index = Math.floor(position);
  const t = position - index;
  return values[index] + (values[index + 1] - values[index]) * t;
}

export function labelStride(count, widthPx, minGapPx = 64) {
  const fit = Math.max(2, Math.floor(widthPx / minGapPx));
  return Math.max(1, Math.ceil(count / fit));
}
