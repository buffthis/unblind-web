// Lines are drawn in a fixed 0..1000 box stretched to the plot, so resizing never
// recomputes coordinates (the stroke keeps its pixel width via non-scaling-stroke).
export const VIEW = 1000;
export const CLIP_PAD = 20;
export const CLIP_FULL = VIEW + CLIP_PAD * 2;

export function xAt(index, count) {
  return count <= 1 ? 0 : (index / (count - 1)) * VIEW;
}

function yAt(value, domain) {
  return VIEW - ((value - domain.min) / (domain.max - domain.min)) * VIEW;
}

// The more points a line has, the thinner it is drawn, so a dense series stays
// readable instead of turning into a thick band.
export function strokeWidthFor(count) {
  if (count > 150) return 1;
  if (count > 80) return 1.5;
  if (count > 40) return 2;
  return 2.5;
}

// Past two points per bucket, the line is thinned: each bucket keeps its lowest and
// highest value where they stand, so spikes and dips survive, and the first and last
// points stay. Returns null when every point fits.
function visibleIndices(values, buckets) {
  const count = values.length;
  if (!Number.isFinite(buckets) || count <= buckets * 2 + 2) return null;
  const picked = [0];
  const inner = count - 2;
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = 1 + Math.floor((bucket * inner) / buckets);
    const to = 1 + Math.floor(((bucket + 1) * inner) / buckets);
    if (to <= from) continue;
    let low = from;
    let high = from;
    for (let i = from + 1; i < to; i += 1) {
      if (values[i] < values[low]) low = i;
      if (values[i] > values[high]) high = i;
    }
    if (low === high) picked.push(low);
    else picked.push(Math.min(low, high), Math.max(low, high));
  }
  picked.push(count - 1);
  return picked;
}

// `buckets` is how many slices of the plot the line may be thinned to; leave it out
// to draw every point.
export function toPoints(values, domain, buckets = Infinity) {
  const indices =
    visibleIndices(values, buckets) ?? values.map((_, index) => index);
  return indices
    .map(
      (index) =>
        `${xAt(index, values.length).toFixed(2)} ${yAt(values[index], domain).toFixed(2)}`
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
