import { animate, useInView } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';

import { CLIP_FULL } from './chartGeometry';

export const DRAW_IN = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };

// The faint "ahead" lines stay hidden while drawing so the upcoming shape is not
// given away. StrictMode runs effects twice in development; the cleanup resets the
// phase so the second run starts the animation again instead of freezing at width 0.
export default function useDrawIn({ rootRef, clipRectRef, aheadRef, reduced }) {
  const inView = useInView(rootRef, { once: true, amount: 0.5 });
  const phase = useRef(reduced ? 'done' : 'waiting');
  const controls = useRef(null);

  const finish = useCallback(() => {
    controls.current?.stop();
    controls.current = null;
    phase.current = 'done';
    clipRectRef.current?.setAttribute('width', String(CLIP_FULL));
    if (aheadRef.current) aheadRef.current.style.opacity = '1';
  }, [clipRectRef, aheadRef]);

  useEffect(() => {
    if (reduced) finish();
  }, [reduced, finish]);

  useEffect(() => {
    if (!inView || phase.current !== 'waiting') return undefined;
    phase.current = 'drawing';
    controls.current = animate(0, CLIP_FULL, {
      ...DRAW_IN,
      onUpdate: (width) =>
        clipRectRef.current?.setAttribute('width', String(width)),
      onComplete: finish,
    });
    return () => {
      controls.current?.stop();
      controls.current = null;
      if (phase.current === 'drawing') phase.current = 'waiting';
    };
  }, [inView, finish, clipRectRef]);

  const isDone = useCallback(() => phase.current === 'done', []);
  return { isDone, finish };
}
