import { LAYOUT } from '@styles/constants';
import { useEffect, useMemo, useState } from 'react';

function headingText(element) {
  return Array.from(element.childNodes)
    .filter(
      (child) =>
        !(
          child.nodeType === Node.ELEMENT_NODE &&
          child.hasAttribute('data-heading-anchor')
        )
    )
    .map((child) => child.textContent)
    .join('')
    .trim();
}

export function readHeadings(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll('h2[id], h3[id]')).map((element) => ({
    id: element.id,
    level: element.tagName === 'H2' ? 2 : 3,
    text: headingText(element),
  }));
}

// Reads headings from the rendered DOM instead of re-slugging the markdown,
// so the ids always match what rehype-slug actually produced.
export default function useArticleHeadings(rootRef, content) {
  const [headings, setHeadings] = useState([]);

  useEffect(() => {
    setHeadings(readHeadings(rootRef.current));
  }, [rootRef, content]);

  return headings;
}

export function useActiveHeading(headings) {
  const [activeId, setActiveId] = useState(null);
  const ids = useMemo(() => headings.map((heading) => heading.id), [headings]);

  useEffect(() => {
    if (ids.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: `-${LAYOUT.HEADER_HEIGHT}px 0px -70% 0px` }
    );

    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

// BrowserRouter does not scroll to a fragment, and the article only exists after
// the post query resolves, so the jump waits for the caller to signal readiness.
export function useScrollToHash(ready) {
  useEffect(() => {
    if (!ready || !window.location.hash) return;
    let id;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    document.getElementById(id)?.scrollIntoView();
  }, [ready]);
}
