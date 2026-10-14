import { useEffect, useState } from 'react';

// A load that finishes quickly never shows the logo, and a logo that did show
// stays long enough to read as a screen instead of a flash.
export const SHOW_AFTER = 200;
export const SHOW_AT_LEAST = 400;
// A loader that mounts right after another unmounts, like a lazy page chunk
// followed by that page's data, carries on the same run instead of starting over.
const CONTINUE_WITHIN = 100;

export function createLoadingRun() {
  let startedAt = null;
  let endedAt = null;
  // Loaders currently mounted. Counting them, rather than noting each unmount,
  // keeps the run alive while the next loader takes over from the last one and
  // through the unmount StrictMode simulates in development.
  let mounted = 0;

  return {
    // Called as a loader first renders. Returns how long it should keep the
    // logo hidden; 0 means the logo is already up.
    start(now) {
      const fresh =
        startedAt === null ||
        (mounted === 0 && now - endedAt > CONTINUE_WITHIN);
      if (fresh) startedAt = now;
      return Math.max(0, startedAt + SHOW_AFTER - now);
    },
    attach() {
      mounted += 1;
    },
    detach(now) {
      mounted -= 1;
      if (mounted === 0) endedAt = now;
    },
    // How much longer content that is ready should wait behind the logo.
    remainingHold(now) {
      if (startedAt === null) return 0;
      const shownAt = startedAt + SHOW_AFTER;
      if (now < shownAt) return 0;
      return Math.max(0, shownAt + SHOW_AT_LEAST - now);
    },
  };
}

// One run for the whole app, since only one loading screen is up at a time.
export const loadingRun = createLoadingRun();

const now = () => performance.now();

// Stays true while `loading` is, then for whatever is left of the logo's minimum.
export function useLoadingHold(loading, run = loadingRun) {
  const [wasLoading, setWasLoading] = useState(loading);
  const [hold, setHold] = useState(0);

  if (loading !== wasLoading) {
    setWasLoading(loading);
    setHold(loading ? 0 : run.remainingHold(now()));
  }

  useEffect(() => {
    if (hold === 0) return undefined;
    const timer = setTimeout(() => setHold(0), hold);
    return () => clearTimeout(timer);
  }, [hold]);

  return loading || hold > 0;
}
