import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

const LANGUAGE_CLASS = /language-([\w-]+)/;
const COPIED_RESET_MS = 1500;
const CODE_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const LINE_HEIGHT = 20;
const BLOCK_PADDING = 16;
const SURFACE = '#fafafa';
// replaceState does not fire hashchange, so blocks hear about line anchors through this.
const LINE_ANCHOR_EVENT = 'codelineanchor';

const Wrapper = styled.div`
  position: relative;
  margin: 24px 0;
  border-radius: 8px;
  /* The page is white, so the box sits one step below it to read as its own surface. */
  background: ${SURFACE};
  /* A 1px ring instead of a border, so the radius stays crisp, plus a faint lift. */
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.08),
    0 2px 2px rgba(0, 0, 0, 0.04),
    0 8px 8px -8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;

const FloatingButton = styled.button`
  position: absolute;
  top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 0 0 1px #ebebeb;
  color: #171717;
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms ease-in-out;

  ${Wrapper}:hover &,
  &:focus-visible {
    opacity: 1;
  }

  &:hover {
    background: #f2f2f2;
  }

  /* Touch screens never hover, so the button would otherwise stay invisible. */
  @media (hover: none) {
    opacity: 1;
  }
`;

const CopyButton = styled(FloatingButton)`
  right: 16px;
`;

// Beside the copy button (16px edge, 32px button, 8px gap). Like it, shown on hover,
// so it never sits over the code; darker while wrapping is on.
const WrapButton = styled(FloatingButton)`
  right: 56px;

  &[aria-pressed='true'] {
    background: #ebebeb;
  }
`;

const IconStack = styled.span`
  position: relative;
  width: 16px;
  height: 16px;
`;

const IconLayer = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  transition:
    opacity 200ms ease-in-out,
    transform 200ms ease-in-out;
  ${({ $shown }) =>
    $shown
      ? css`
          opacity: 1;
          transform: scale(1);
        `
      : css`
          opacity: 0;
          transform: scale(0.5);
        `}
`;

// The whole row scrolls sideways, so the scrollbar spans the box. The line numbers
// hold still (see Gutter) while the code slides under them.
const Body = styled.div`
  position: relative;
  overflow-x: auto;
  scrollbar-width: thin;
  font-family: ${CODE_FONT};
  font-size: 13px;
  line-height: ${LINE_HEIGHT}px;
  color: #171717;
`;

// Unwrapped, as wide as the longest line but never narrower than the box. Wrapped,
// exactly the box, so lines break instead of scrolling.
const Row = styled.div`
  position: relative;
  display: flex;
  ${({ $wrap }) =>
    $wrap
      ? css`
          width: 100%;
        `
      : css`
          width: max-content;
          min-width: 100%;
        `}
`;

const ActiveLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  background: #fef0cd;
  box-shadow: inset 2px 0 0 0 #a35200;
  pointer-events: none;
`;

// Sticky, with the box's own color so code passing under it is hidden. The active
// line is drawn once more inside it, since the full-width one is covered here.
const Gutter = styled.div`
  position: sticky;
  left: 0;
  z-index: 1;
  background: ${SURFACE};
  flex: none;
  display: flex;
  flex-direction: column;
  padding: ${BLOCK_PADDING}px 0 ${BLOCK_PADDING}px ${BLOCK_PADDING}px;
  user-select: none;

  /* Narrow screens need the width for code more than for numbers. */
  @media (max-width: 600px) {
    display: none;
  }
`;

const LineNumber = styled.button`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  height: ${LINE_HEIGHT}px;
  padding: 0 16px 0 0;
  border: none;
  background: none;
  font: inherit;
  text-align: right;
  color: ${({ $hovered }) => ($hovered ? '#171717' : '#a8a8a8')};
  cursor: pointer;
`;

const Pre = styled.pre`
  position: relative;
  ${({ $wrap }) =>
    $wrap
      ? css`
          flex: 1 1 0;
          min-width: 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        `
      : css`
          flex: 1 0 auto;
        `}
  margin: 0;
  padding: ${BLOCK_PADDING}px ${BLOCK_PADDING}px ${BLOCK_PADDING}px 0;
  font: inherit;

  @media (max-width: 600px) {
    padding-left: ${BLOCK_PADDING}px;
  }

  /* Vercel-like token colors over the github theme the article already loads. */
  .hljs-keyword,
  .hljs-built_in {
    color: #bd2864;
  }

  .hljs-title {
    color: #7820bc;
  }

  .hljs-string,
  .hljs-literal {
    color: #297a3a;
  }
`;

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect
        x="5.5"
        y="5.5"
        width="8"
        height="8"
        rx="1.5"
        fill="none"
        stroke="currentColor"
      />
      <path
        d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5"
        fill="none"
        stroke="currentColor"
      />
    </svg>
  );
}

function WrapIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 4h11M2.5 8h8.5a2.25 2.25 0 0 1 0 4.5H7.5M2.5 12.5H5M9 10.5 7 12.5l2 2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 8.5 6 12l7.5-8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function getLanguage(children) {
  const [code] = React.Children.toArray(children);
  const className = code?.props?.className || '';
  return className.match(LANGUAGE_CLASS)?.[1] ?? null;
}

// Highlighted code arrives as nested spans, so the text has to be collected recursively.
function textOf(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return node?.props ? textOf(node.props.children) : '';
}

// Markdown code ends with a newline that does not start a visible line.
function trimFinalNewline(text) {
  return text.replace(/\n$/, '');
}

// The id comes from the code itself, so a shared line link survives edits elsewhere in the post.
function blockIdOf(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return `code-${hash.toString(36)}`;
}

const LINE_ANCHOR_HASH = /^#code-[0-9a-z]+-L\d+(?:-L\d+)?$/;

function clearLineAnchor() {
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  );
  window.dispatchEvent(new Event(LINE_ANCHOR_EVENT));
}

// A reload starts with nothing selected; only a link opened fresh restores its lines.
export function dropLineAnchorAfterReload() {
  const [entry] = window.performance?.getEntriesByType?.('navigation') ?? [];
  if (entry?.type !== 'reload' || entry.name !== window.location.href) return;
  if (!LINE_ANCHOR_HASH.test(window.location.hash)) return;
  clearLineAnchor();
}

// Runs once per page load, before any block reads the address.
dropLineAnchorAfterReload();

// Accepts #<block>-L3 and the range form #<block>-L2-L5, in either order.
function readActiveRange(blockId, lineCount) {
  let hash;
  try {
    hash = decodeURIComponent(window.location.hash);
  } catch {
    return null;
  }
  const prefix = `#${blockId}-`;
  if (!hash.startsWith(prefix)) return null;
  const match = hash.slice(prefix.length).match(/^L(\d+)(?:-L(\d+))?$/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = match[2] ? Number(match[2]) : a;
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  return start >= 1 && end <= lineCount ? { start, end } : null;
}

// A wrapped line takes several rows, and highlighted code is not split into line
// elements, so each line is measured through a range over its own characters.
function measureLineRows(pre, lineCount) {
  const nodes = [];
  let total = 0;
  const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push({ node, start: total });
    total += node.length;
  }
  const locate = (offset) => {
    const found =
      nodes.find(({ node, start }) => offset <= start + node.length) ??
      nodes[nodes.length - 1];
    return (
      found && [found.node, Math.min(offset - found.start, found.node.length)]
    );
  };

  const lines = pre.textContent.split('\n').slice(0, lineCount);
  let offset = 0;
  return lines.map((line) => {
    const start = locate(offset);
    const end = locate(offset + line.length);
    offset += line.length + 1;
    if (!start || !end || line === '') return 1;
    const range = document.createRange();
    range.setStart(...start);
    range.setEnd(...end);
    // Boxes less than half a line apart still belong to the same row.
    const tops = [];
    Array.from(range.getClientRects?.() ?? [])
      .map((rect) => rect.top)
      .sort((a, b) => a - b)
      .forEach((top) => {
        if (
          tops.length === 0 ||
          top - tops[tops.length - 1] > LINE_HEIGHT / 2
        ) {
          tops.push(top);
        }
      });
    return Math.max(1, tops.length);
  });
}

// Heights of the lines while wrapping is on, or null when every line is one row.
function useWrappedLineHeights(preRef, wrap, lineCount, text) {
  const [heights, setHeights] = useState(null);

  useLayoutEffect(() => {
    const pre = preRef.current;
    if (!wrap || !pre) {
      setHeights(null);
      return undefined;
    }
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const next = measureLineRows(pre, lineCount).map(
        (rows) => rows * LINE_HEIGHT
      );
      setHeights((current) =>
        current && current.join() === next.join() ? current : next
      );
    };
    measure();
    // The rows change with the box width and once web fonts settle.
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(pre);
    document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [preRef, wrap, lineCount, text]);

  return heights;
}

function useActiveRange(blockId, lineCount) {
  const [range, setRange] = useState(() => readActiveRange(blockId, lineCount));

  useEffect(() => {
    const sync = () => setRange(readActiveRange(blockId, lineCount));
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener(LINE_ANCHOR_EVENT, sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener(LINE_ANCHOR_EVENT, sync);
    };
  }, [blockId, lineCount]);

  return range;
}

export default function CodeBlock({ children }) {
  const wrapperRef = useRef(null);
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [wrap, setWrap] = useState(false);
  const text = trimFinalNewline(textOf(children));
  const lineCount = text.split('\n').length;
  const blockId = blockIdOf(text);
  const activeRange = useActiveRange(blockId, lineCount);
  const wrappedHeights = useWrappedLineHeights(preRef, wrap, lineCount, text);
  const heightOf = (i) => wrappedHeights?.[i] ?? LINE_HEIGHT;
  // Distance from the top of the code to the top of line `index` (zero-based).
  const offsetOf = (index) =>
    Array.from({ length: index }, (_, i) => heightOf(i)).reduce(
      (sum, height) => sum + height,
      0
    );
  // The line a plain click picked; shift-clicks stretch the range from here.
  const anchorLineRef = useRef(null);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  // A shared line link should land on that line once the post has rendered.
  useEffect(() => {
    if (readActiveRange(blockId, lineCount) == null) return;
    wrapperRef.current?.scrollIntoView?.({ block: 'center' });
    // Only the first render can carry a link from outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeRange) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      anchorLineRef.current = null;
      clearLineAnchor();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeRange]);

  // Cmd/Ctrl+C copies the selected lines, unless the reader has selected text themselves.
  useEffect(() => {
    if (!activeRange) return undefined;
    const handleCopyShortcut = (event) => {
      if (!window.getSelection()?.isCollapsed) return;
      const lines = (preRef.current?.textContent ?? '')
        .split('\n')
        .slice(activeRange.start - 1, activeRange.end)
        .join('\n');
      event.clipboardData?.setData('text/plain', lines);
      event.preventDefault();
    };
    document.addEventListener('copy', handleCopyShortcut);
    return () => document.removeEventListener('copy', handleCopyShortcut);
  }, [activeRange]);

  // navigator.clipboard is missing outside secure contexts, so the access itself sits inside try.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preRef.current?.textContent ?? '');
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // replaceState keeps the page still and out of the back-button history.
  const handleLineClick = (event, line) => {
    const anchor = anchorLineRef.current ?? activeRange?.start;
    if (event.shiftKey && anchor != null) {
      const start = Math.min(anchor, line);
      const end = Math.max(anchor, line);
      const target = start === end ? `L${start}` : `L${start}-L${end}`;
      window.history.replaceState(null, '', `#${blockId}-${target}`);
    } else {
      anchorLineRef.current = line;
      window.history.replaceState(null, '', `#${blockId}-L${line}`);
    }
    window.dispatchEvent(new Event(LINE_ANCHOR_EVENT));
  };

  // Highlighted code is not split into line elements, so the line comes from the pointer height.
  const handlePointerMove = (event) => {
    const top = event.currentTarget.getBoundingClientRect().top;
    const y = event.clientY - top - BLOCK_PADDING;
    let line = null;
    for (let i = 0; i < lineCount; i += 1) {
      if (y >= offsetOf(i) && y < offsetOf(i + 1)) {
        line = i + 1;
        break;
      }
    }
    setHoveredLine(line);
  };

  const activeLineStyle = activeRange && {
    top: BLOCK_PADDING + offsetOf(activeRange.start - 1),
    height: offsetOf(activeRange.end) - offsetOf(activeRange.start - 1),
  };

  return (
    <Wrapper ref={wrapperRef}>
      <Body
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setHoveredLine(null)}
      >
        <Row $wrap={wrap}>
          {activeRange && (
            <ActiveLine data-testid="active-line" style={activeLineStyle} />
          )}
          <Gutter aria-hidden="true">
            {activeRange && (
              <ActiveLine
                data-testid="active-line-gutter"
                style={activeLineStyle}
              />
            )}
            {Array.from({ length: lineCount }, (_, i) => (
              <LineNumber
                key={i}
                type="button"
                tabIndex={-1}
                $hovered={hoveredLine === i + 1}
                style={{ height: heightOf(i) }}
                // Shift would otherwise extend the page's text selection on press.
                onMouseDown={(event) =>
                  event.shiftKey && event.preventDefault()
                }
                onClick={(event) => handleLineClick(event, i + 1)}
              >
                {i + 1}
              </LineNumber>
            ))}
          </Gutter>
          <Pre ref={preRef} $wrap={wrap}>
            {children}
          </Pre>
        </Row>
      </Body>
      <WrapButton
        type="button"
        aria-label="줄바꿈"
        aria-pressed={wrap}
        onClick={() => setWrap((on) => !on)}
      >
        <WrapIcon />
      </WrapButton>
      <CopyButton
        type="button"
        aria-label={copied ? '복사됨' : '복사'}
        onClick={handleCopy}
      >
        <IconStack>
          <IconLayer $shown={!copied}>
            <CopyIcon />
          </IconLayer>
          <IconLayer $shown={copied}>
            <CheckIcon />
          </IconLayer>
        </IconStack>
      </CopyButton>
    </Wrapper>
  );
}
