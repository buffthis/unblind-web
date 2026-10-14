import { useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

// A block counts as revealed once its top passes this share of the viewport height.
const REVEAL_LINE = 0.92;

// Shows every block whose top is above the reveal line and hides the rest, so a
// block hides again only when it drops back below the viewport and scrolling up
// replays its entrance. Blocks above the viewport stay shown, including those
// above a #hash landing spot. All rects are read before any attribute changes so
// the browser lays out once.
//
// With `entrance`, the blocks shown by this sync start one after another so the
// first screen follows the page header in. Any later sync clears those delays,
// which leaves a transition that already started untouched.
export function syncBlocks(root, viewportHeight, entrance = null) {
  const line = viewportHeight * REVEAL_LINE;
  const blocks = Array.from(root.children);
  const shown = blocks.map((block) => block.getBoundingClientRect().top < line);
  let order = 0;
  blocks.forEach((block, index) => {
    block.toggleAttribute('data-shown', shown[index]);
    if (entrance && shown[index]) {
      const { start, step, max } = entrance;
      const delay = Math.min(start + step * order, max);
      block.style.setProperty('--reveal-delay', `${delay}ms`);
      order += 1;
    } else {
      block.style.removeProperty('--reveal-delay');
    }
  });
}

// The observer only says when to look again. Its entries are not used directly: a
// fast scroll can carry a block across the viewport without any entry for it, and
// one batch can hold entries measured at different scroll positions.
const OPTIONS = {
  rootMargin: `0px 0px -${Math.round((1 - REVEAL_LINE) * 100)}% 0px`,
};

// Returns whether reveal is active, so the caller can mark the container for CSS.
// `content` re-runs the effect because the markdown renders new block elements.
// `entrance` ({ start, step, max } in ms) staggers the blocks of the first sync;
// pass a stable object so it does not re-run the effect.
export default function useScrollReveal(ref, enabled, content, entrance) {
  const reduced = useReducedMotion();
  const active = Boolean(enabled && !reduced);

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return undefined;
    let pending = entrance ?? null;
    const observer = new IntersectionObserver(() => {
      syncBlocks(root, window.innerHeight, pending);
      pending = null;
    }, OPTIONS);
    Array.from(root.children).forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, [ref, active, content, entrance]);

  return active;
}
