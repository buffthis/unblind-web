const NICE_FACTORS = [1, 2, 2.5, 5, 10];
const TARGET_STEPS = 4;

const round = (value) => Number(value.toPrecision(12));

export function niceStep(span) {
  const raw = span / TARGET_STEPS;
  const power = 10 ** Math.floor(Math.log10(raw));
  const factor = NICE_FACTORS.find((f) => f * power >= raw - 1e-12);
  return round(factor * power);
}

// A dot sits on its value rather than growing from zero, so its axis may start
// anywhere. This share of the data span is added on each side so no dot sits on the
// edge of the plot.
const DOT_MARGIN = 0.1;

// The lowest and highest of the values. Spreading them into Math.min fails with a stack
// overflow somewhere past a hundred thousand arguments, which a data file can reach.
function extent(values) {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return [low, high];
}

function dotRange(values) {
  let [low, high] = extent(values);
  if (high === low) {
    low -= 0.5;
    high += 0.5;
  }
  const margin = (high - low) * DOT_MARGIN;
  // The margin never carries an axis across zero that the data does not cross.
  return [
    low >= 0 ? Math.max(0, low - margin) : low - margin,
    high <= 0 ? Math.min(0, high + margin) : high + margin,
  ];
}

// Explicit min/max win; otherwise the axis starts at min(0, data) and rounds outward
// to a nice step, so lines rarely touch the frame by accident. A bar chart also
// reaches up to zero, because a bar is drawn from zero. A reference line or range
// counts as data, so it is always on the axis.
export function computeDomain(
  data,
  { min = null, max = null, type = 'line', limit = null, band = null } = {}
) {
  const values = [
    ...data.filter((value) => value != null),
    ...(limit ? [limit.value] : []),
    ...(band ? [band.from, band.to] : []),
  ];
  const [low0, high0] = extent(values);
  const [dataLow, dataHigh] =
    type === 'dot'
      ? dotRange(values)
      : [Math.min(0, low0), Math.max(type === 'bar' ? 0 : -Infinity, high0)];
  let low = min ?? dataLow;
  let high = max ?? dataHigh;
  if (high <= low) {
    if (max == null) high = low + 1;
    else low = high - 1;
  }
  const step = niceStep(high - low);
  // The epsilon keeps float noise (e.g. 0.8 / 0.2) from rounding a whole extra step.
  const domainMin = min ?? round(Math.floor(low / step + 1e-9) * step);
  const domainMax = max ?? round(Math.ceil(high / step - 1e-9) * step);
  const first = Math.ceil(domainMin / step - 1e-9);
  const last = Math.floor(domainMax / step + 1e-9);
  const ticks = [];
  for (let i = first; i <= last; i += 1) ticks.push(round(i * step));
  return { min: domainMin, max: domainMax, ticks };
}

// Rounding first and `|| 0` keep -0 and tiny negatives such as -0.001 from printing "-0".
export function formatValue(value, unit) {
  const rounded = Number(value.toFixed(2)) || 0;
  return `${rounded.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}`;
}
