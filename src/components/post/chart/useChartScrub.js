import { useMotionValueEvent, useSpring } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { CLIP_PAD, indexFromRatio, valueAt, VIEW, xAt } from './chartGeometry';
import { formatValue } from './chartScale';

export const SPRING = { stiffness: 400, damping: 40, mass: 1 };

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

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
  const {
    root: rootRef,
    inner: innerRef,
    clipRect: clipRectRef,
    crosshair: crosshairRef,
    readout: readoutRef,
    label: labelRef,
    points: pointsRef,
    values: valuesRef,
  } = refs;
  const position = useSpring(last, SPRING);
  const active = useRef(false);
  const target = useRef(last);

  function place(at) {
    if (drawIn.isDone()) {
      clipRectRef.current?.setAttribute(
        'width',
        String(xAt(at, count) + CLIP_PAD)
      );
    }
    if (!active.current) return;
    const percent = (xAt(at, count) / VIEW) * 100;
    if (crosshairRef.current) crosshairRef.current.style.left = `${percent}%`;
    chart.series.forEach((s, k) => {
      const point = pointsRef.current[k];
      if (!point) return;
      const value = valueAt(s.values, at);
      // A series that ended early has no point after its last value.
      point.style.visibility = value == null ? 'hidden' : '';
      if (value == null) return;
      point.style.left = `${percent}%`;
      point.style.top = `${(1 - (value - domain.min) / (domain.max - domain.min)) * 100}%`;
    });
    const readout = readoutRef.current;
    const inner = innerRef.current;
    if (readout && inner) {
      const plotWidth = inner.clientWidth;
      const ownWidth = readout.offsetWidth;
      const left = clamp(
        (percent / 100) * plotWidth - ownWidth / 2,
        0,
        Math.max(0, plotWidth - ownWidth)
      );
      readout.style.transform = `translateX(${left}px)`;
    }
  }

  useMotionValueEvent(position, 'change', place);

  function writeReadout(index) {
    chart.series.forEach((s, k) => {
      const element = valuesRef.current[k];
      if (element) {
        const value = s.values[index];
        element.textContent =
          value == null ? '-' : formatValue(value, chart.unit);
      }
    });
    if (labelRef.current) labelRef.current.textContent = chart.labels[index];
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
    rootRef.current?.setAttribute('data-shown', 'true');
    moveTo(index, true);
  }

  function leave() {
    if (!active.current) return;
    active.current = false;
    rootRef.current?.setAttribute('data-shown', 'false');
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

  // The chart stays mounted while its source is edited, so new data under an active
  // pointer must not leave the old values on screen. The helpers are read through a
  // ref so the effect runs on data changes only, not on every render.
  const latest = useRef(null);
  useEffect(() => {
    latest.current = { writeReadout, place };
  });
  useEffect(() => {
    if (!active.current) return;
    const next = clamp(target.current, 0, last);
    target.current = next;
    latest.current.writeReadout(next);
    position.jump(next);
    latest.current.place(next);
  }, [chart, last, position]);

  function indexFromPointer(event) {
    const rect = innerRef.current.getBoundingClientRect();
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
