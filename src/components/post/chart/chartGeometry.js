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

// The index of the last row a series has a value in. A series that ended early has
// blanks (null) after it.
export function lastValueIndex(values) {
  let last = values.length - 1;
  while (last > 0 && values[last] == null) last -= 1;
  return last;
}

// The "x y" of a series' last value, where an early-ended line stops.
export function endPoint(values, domain) {
  const index = lastValueIndex(values);
  return `${xAt(index, values.length).toFixed(2)} ${yAt(values[index], domain).toFixed(2)}`;
}

// `buckets` is how many slices of the plot the line may be thinned to; leave it out
// to draw every point.
export function toPoints(values, domain, buckets = Infinity) {
  // The line stops at the last value, but x positions still follow the whole table.
  const used = values.slice(0, lastValueIndex(values) + 1);
  const indices =
    visibleIndices(used, buckets) ?? used.map((_, index) => index);
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

// null once the position is past the end of a series that ended early.
export function valueAt(values, position) {
  const last = values.length - 1;
  if (position >= last) return values[last];
  if (position <= 0) return values[0];
  const index = Math.floor(position);
  const t = position - index;
  if (values[index + 1] == null) return t === 0 ? values[index] : null;
  return values[index] + (values[index + 1] - values[index]) * t;
}

// The steps a label may be spaced by, in rows. Up to 30 they are the usual round counts.
// From 60 up they are the round numbers of a clock (1, 1.5, 2, 3, 4, 5, 10, 15, 30
// minutes, then 1, 2, 3, 6, 12 and 24 hours at a row a second), so a series with a row a
// second gets a label every 3 or 10 minutes rather than every 183 or 500 rows, which
// would put them at 3:01 and 8:20.
const ROUND_STEPS = [
  1, 2, 3, 5, 6, 10, 12, 15, 20, 30, 60, 90, 120, 180, 240, 300, 600, 900, 1800,
  3600, 7200, 10800, 21600, 43200, 86400,
];

// How many rows apart the x labels go: the least round step that still fits the labels
// in the width, so they sit on rows 0, step, 2 * step, ...
export function labelStride(count, widthPx, minGapPx = 64) {
  const fit = Math.max(2, Math.floor(widthPx / minGapPx));
  const needed = Math.max(1, Math.ceil(count / fit));
  return ROUND_STEPS.find((step) => step >= needed) ?? needed;
}
