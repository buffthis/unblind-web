import { useMotionValueEvent, useSpring } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { formatValue } from './chartScale';
import { SPRING } from './useChartScrub';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// The bar counterpart of useChartScrub. The spring drives a fractional row index
// that only moves the highlight band; the readout and the dimming switch to the
// target row at once, so values never show for a row the pointer is not on.
export default function useBarScrub({ chart, reduced, refs }) {
  const count = chart.labels.length;
  const last = count - 1;
  const {
    root: rootRef,
    inner: innerRef,
    band: bandRef,
    columns: columnsRef,
    readout: readoutRef,
    label: labelRef,
    values: valuesRef,
  } = refs;
  const position = useSpring(0, SPRING);
  const active = useRef(false);
  const target = useRef(0);

  function place(at) {
    if (!active.current) return;
    const percent = (at / count) * 100;
    if (bandRef.current) bandRef.current.style.left = `${percent}%`;
    const readout = readoutRef.current;
    const inner = innerRef.current;
    if (readout && inner) {
      const plotWidth = inner.clientWidth;
      const ownWidth = readout.offsetWidth;
      const center = ((at + 0.5) / count) * plotWidth;
      const left = clamp(
        center - ownWidth / 2,
        0,
        Math.max(0, plotWidth - ownWidth)
      );
      readout.style.transform = `translateX(${left}px)`;
    }
  }

  useMotionValueEvent(position, 'change', place);

  function highlight(index) {
    columnsRef.current.forEach((column, i) => {
      if (column) column.dataset.dim = String(index != null && i !== index);
    });
  }

  function writeReadout(index) {
    chart.series.forEach((s, k) => {
      const element = valuesRef.current[k];
      if (element)
        element.textContent = formatValue(s.values[index], chart.unit);
    });
    if (labelRef.current) labelRef.current.textContent = chart.labels[index];
    highlight(index);
  }

  // jump() emits no change event when the value is unchanged, so immediate moves
  // place the band explicitly.
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
    active.current = true;
    rootRef.current?.setAttribute('data-shown', 'true');
    moveTo(index, true);
  }

  function leave() {
    if (!active.current) return;
    active.current = false;
    rootRef.current?.setAttribute('data-shown', 'false');
    highlight(null);
  }

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
    return clamp(Math.floor(ratio * count), 0, last);
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
