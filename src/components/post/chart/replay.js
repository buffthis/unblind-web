import { createContext } from 'react';

// True inside a post page, where a chart draws itself in again each time it scrolls
// back into view. Elsewhere (the editor preview) it draws in once.
export const ChartReplayContext = createContext(false);
