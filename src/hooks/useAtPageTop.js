import { useSyncExternalStore } from 'react';

function subscribe(onChange) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

// Reports whether the page is scrolled to the very top.
export default function useAtPageTop() {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY <= 0,
    () => false
  );
}
