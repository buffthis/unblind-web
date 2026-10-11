import { useCallback, useEffect, useState } from 'react';

const SAVE_DELAY_MS = 1000;

export function draftKey(postId) {
  return postId == null ? 'post-draft:new' : `post-draft:${postId}`;
}

export function readDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && typeof draft === 'object' ? draft : null;
  } catch {
    return null;
  }
}

function writeDraft(key, values) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ ...values, savedAt: new Date().toISOString() })
    );
    return true;
  } catch (error) {
    console.error('Failed to save draft:', error);
    return false;
  }
}

// The server has no draft storage, so drafts live in this browser only.
// Callers keep enabled false until the user has decided what to do with an existing draft.
export default function usePostDraft(key, values, enabled) {
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => {
      if (writeDraft(key, values)) setSavedAt(new Date());
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key, values, enabled]);

  const flush = useCallback(() => {
    if (!enabled) return;
    if (writeDraft(key, values)) setSavedAt(new Date());
  }, [key, values, enabled]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
    setSavedAt(null);
  }, [key]);

  return { savedAt, flush, clear };
}
