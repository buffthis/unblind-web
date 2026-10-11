import { useEffect } from 'react';

// Covers tab close and reload only. In-app navigation cannot be blocked because
// useBlocker needs a data router and this app uses BrowserRouter; drafts cover that path.
export default function useUnsavedChangesWarning(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);
}
