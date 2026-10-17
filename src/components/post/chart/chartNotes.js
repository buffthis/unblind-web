import { formatValue } from './chartScale';

// Two labels collide when they are closer than this share of the plot height (a label
// is about 14px tall on a plot of 180 to 220px) and closer than this share of the plot
// width across, which is about how wide a short label runs.
const MIN_GAP = 9;
const NEAR_X = 35;
// Past this share of the plot a label turns around to sit on the left of its point.
const FLIP_AFTER = 70;
// A label never goes below this, so a stack at the bottom stays inside the plot.
const LOWEST = 96;

// Takes where each note's point is (x from the left, y from the top, both as a percentage
// of the plot) and says where its label goes. A label starts level with its point, and
// when it would sit on one above it, it moves down one gap below that one. The answer
// follows the order of the notes given.
export function placeNotes(points) {
  const byHeight = points
    .map((_, index) => index)
    .sort((a, b) => points[a].y - points[b].y);
  const placed = [];
  const settled = [];
  byHeight.forEach((index) => {
    const { x, y } = points[index];
    let labelY = y;
    for (let guard = 0; guard <= points.length; guard += 1) {
      const clash = settled.find(
        (other) =>
          Math.abs(other.x - x) < NEAR_X &&
          Math.abs(other.labelY - labelY) < MIN_GAP
      );
      if (!clash) break;
      labelY = clash.labelY + MIN_GAP;
    }
    labelY = Math.min(labelY, LOWEST);
    settled.push({ x, labelY });
    placed[index] = { x, y, labelY, flip: x > FLIP_AFTER };
  });
  return placed;
}

// The text of a note, with {value} replaced by the value at the point it belongs to.
export function noteText({ index, seriesIndex, text }, chart) {
  const value = chart.series[seriesIndex].values[index];
  return text.replace(/\{value\}/g, formatValue(value, chart.unit));
}
