// returnTo is limited to in-app paths; accepting any URL would make it an open redirect.
// Judge by the origin of the resolved URL rather than by string checks, so that
// protocol-relative tricks such as '//' or '/\' are caught too.
export function sanitizeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

// Google login leaves the app for the API and Google, and the API always sends the
// browser back to a fixed URL, so the query string cannot carry returnTo across it.
// sessionStorage survives that round trip because it is scoped to this tab and origin.
const STORAGE_KEY = 'auth.pendingReturnTo';

// A stash older than this belongs to a login the user walked away from.
export const PENDING_RETURN_TO_TTL_MS = 10 * 60 * 1000;

export function stashPendingReturnTo(path, now = Date.now()) {
  const safe = sanitizeReturnTo(path);
  if (!safe || safe === '/') return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ path: safe, savedAt: now })
    );
  } catch {
    // Storage can be blocked (private mode, site data off). Login still works,
    // it just lands on the default page.
  }
}

// Reads and always removes the stash, so a value is used at most once.
export function takePendingReturnTo(now = Date.now()) {
  let raw;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const { path, savedAt } = JSON.parse(raw);
    if (typeof savedAt !== 'number') return null;
    if (now - savedAt > PENDING_RETURN_TO_TTL_MS || now < savedAt) return null;
    return sanitizeReturnTo(path);
  } catch {
    return null;
  }
}

export function clearPendingReturnTo() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
