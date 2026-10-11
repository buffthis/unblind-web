import { useMotionValueEvent, useSpring } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { CLIP_PAD, indexFromRatio, valueAt, VIEW, xAt } from './chartGeometry';
import { formatValue } from './chartScale';

export const SPRING = { stiffness: 400, damping: 40, mass: 1 };

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// DOM writes live outside the hook so the compiler lint does not read them as
// mutations of the hook's arguments (the refs).
const setStyle = (element, style) => Object.assign(element.style, style);
const setText = (element, text) => {
  element.textContent = text;
};

// One spring drives a fractional point index; every moving part is derived from it
// and written straight to the DOM, so scrubbing never re-renders the chart.
export default function useChartScrub({
  chart,
  domain,
  reduced,
  drawIn,
  refs,
}) {
  const count = chart.labels.length;
  const last = count - 1;
  const position = useSpring(last, SPRING);
  const active = useRef(false);
  const target = useRef(last);

  function place(at) {
    if (drawIn.isDone()) {
      refs.clipRect.current?.setAttribute(
        'width',
        String(xAt(at, count) + CLIP_PAD)
      );
    }
    if (!active.current) return;
    const percent = (xAt(at, count) / VIEW) * 100;
    const crosshair = refs.crosshair.current;
    if (crosshair) setStyle(crosshair, { left: `${percent}%` });
    chart.series.forEach((s, k) => {
      const point = refs.points.current[k];
      if (!point) return;
      const value = valueAt(s.values, at);
      setStyle(point, {
        left: `${percent}%`,
        top: `${(1 - (value - domain.min) / (domain.max - domain.min)) * 100}%`,
      });
    });
    const readout = refs.readout.current;
    const plot = refs.plot.current;
    if (readout && plot) {
      const plotWidth = plot.clientWidth;
      const ownWidth = readout.offsetWidth;
      const left = clamp(
        (percent / 100) * plotWidth - ownWidth / 2,
        0,
        Math.max(0, plotWidth - ownWidth)
      );
      setStyle(readout, { transform: `translateX(${left}px)` });
    }
  }

  useMotionValueEvent(position, 'change', place);

  function writeReadout(index) {
    chart.series.forEach((s, k) => {
      const element = refs.values.current[k];
      if (element) setText(element, formatValue(s.values[index], chart.unit));
    });
    const label = refs.label.current;
    if (label) setText(label, chart.labels[index]);
  }

  // jump() emits no change event when the value is unchanged (the spring rests on the
  // last point), so immediate moves place the parts explicitly.
  function moveTo(index, immediate) {
    const next = clamp(index, 0, last);
    target.current = next;
    writeReadout(next);
    if (immediate || reduced) {
      position.jump(next);
      place(next);
    } else {
      position.set(next);
    }
  }

  function enter(index) {
    if (!drawIn.isDone()) drawIn.finish();
    active.current = true;
    refs.root.current?.setAttribute('data-shown', 'true');
    moveTo(index, true);
  }

  function leave() {
    if (!active.current) return;
    active.current = false;
    refs.root.current?.setAttribute('data-shown', 'false');
    if (reduced) {
      position.jump(last);
      place(last);
    } else {
      position.set(last);
    }
  }

  useEffect(() => {
    if (active.current) return;
    target.current = last;
    position.jump(last);
  }, [last, position]);

  function indexFromPointer(event) {
    const rect = refs.plot.current.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    return indexFromRatio(ratio, count);
  }

  function onPointerMove(event) {
    const index = indexFromPointer(event);
    if (!active.current) enter(index);
    else if (index !== target.current) moveTo(index, false);
  }

  function onPointerUp(event) {
    if (event.pointerType !== 'mouse') leave();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      leave();
      return;
    }
    const steps = {
      ArrowLeft: target.current - 1,
      ArrowRight: target.current + 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in steps)) return;
    event.preventDefault();
    const next = clamp(steps[event.key], 0, last);
    if (!active.current) enter(next);
    else moveTo(next, false);
  }

  return {
    onPointerMove,
    onPointerDown: onPointerMove,
    onPointerUp,
    onPointerLeave: leave,
    onPointerCancel: leave,
    onKeyDown,
    onBlur: leave,
  };
}
