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
  return (
    Array.from(root.querySelectorAll('h1[id], h2[id], h3[id]'))
      // The footnotes carry a hidden heading of their own for screen readers.
      .filter((element) => !element.closest('[data-footnotes]'))
      .map((element) => ({
        id: element.id,
        level: Number(element.tagName[1]),
        text: headingText(element),
      }))
  );
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

// A heading is active while it is in this band: below the header, down to this share of
// the window height.
const ACTIVE_BAND = 0.3;

const inActiveBand = (element) => {
  const { top, bottom } = element.getBoundingClientRect();
  return (
    bottom > LAYOUT.HEADER_HEIGHT && top < window.innerHeight * ACTIVE_BAND
  );
};

// At the very top of the page nothing is active, even when the first heading already
// sits inside the band: the reader has not scrolled to any heading yet. Once the page
// is scrolled, the heading in the band is picked up without waiting for another one to
// enter it.
export function useActiveHeading(headings) {
  const [activeId, setActiveId] = useState(null);
  const ids = useMemo(() => headings.map((heading) => heading.id), [headings]);

  useEffect(() => {
    if (ids.length === 0) return undefined;

    const elements = () =>
      ids.map((id) => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        if (window.scrollY <= 0) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: `-${LAYOUT.HEADER_HEIGHT}px 0px -70% 0px` }
    );

    const onScroll = () => {
      if (window.scrollY <= 0) {
        setActiveId(null);
        return;
      }
      setActiveId(
        (current) => current ?? elements().find(inActiveBand)?.id ?? null
      );
    };

    elements().forEach((element) => observer.observe(element));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
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
