const NICE_FACTORS = [1, 2, 2.5, 5, 10];
const TARGET_STEPS = 4;

const round = (value) => Number(value.toPrecision(12));

export function niceStep(span) {
  const raw = span / TARGET_STEPS;
  const power = 10 ** Math.floor(Math.log10(raw));
  const factor = NICE_FACTORS.find((f) => f * power >= raw - 1e-12);
  return round(factor * power);
}

// Explicit min/max win; otherwise the axis starts at min(0, data) and rounds outward
// to a nice step, so lines rarely touch the frame by accident.
export function computeDomain(values, { min = null, max = null } = {}) {
  let low = min ?? Math.min(0, ...values);
  let high = max ?? Math.max(...values);
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
