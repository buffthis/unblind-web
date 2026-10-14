import React from 'react';
import styled from 'styled-components';

// GitHub-style alerts: a blockquote whose first line is [!NOTE], [!TIP], [!IMPORTANT],
// [!WARNING] or [!CAUTION]. The marker picks the color, icon and Korean title.
const ALERT_TYPES = {
  NOTE: { title: '참고', color: '#0969da' },
  TIP: { title: '팁', color: '#1a7f37' },
  IMPORTANT: { title: '중요', color: '#8250df' },
  WARNING: { title: '경고', color: '#9a6700' },
  CAUTION: { title: '주의', color: '#d1242f' },
};

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/i;

// Returns { type, children } with the marker removed, or null for an ordinary quote.
export function parseAlert(children) {
  const items = React.Children.toArray(children);
  const index = items.findIndex(
    (item) => React.isValidElement(item) && item.type === 'p'
  );
  if (index === -1) return null;
  const paragraph = items[index];
  const [head, ...rest] = React.Children.toArray(paragraph.props.children);
  if (typeof head !== 'string') return null;
  const match = head.match(MARKER);
  if (!match) return null;

  const remaining = head.slice(match[0].length);
  // The marker line ends in a line break element when the body starts on the next line.
  const body =
    !remaining && React.isValidElement(rest[0]) && rest[0].type === 'br'
      ? rest.slice(1)
      : rest;
  const content = remaining ? [remaining, ...rest] : body;
  const next = [...items];
  if (content.length > 0) {
    next[index] = React.cloneElement(paragraph, {}, ...content);
  } else {
    next.splice(index, 1);
  }
  return { type: match[1].toUpperCase(), children: next };
}

const Box = styled.div`
  margin: 24px 0 8px;
  padding: 4px 0 4px 20px;
  border-left: 4px solid ${({ $color }) => $color};

  /* The article's own p margin (24px 0 8px) outranks the Title class, so reset it here. */
  > :first-child {
    margin-top: 0;
    margin-bottom: 0;
  }

  > :nth-child(2) {
    margin-top: 8px;
  }

  > :last-child {
    margin-bottom: 0;
  }
`;

const Title = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

const ICONS = {
  NOTE: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7.25V11M8 4.9v.01" />
    </>
  ),
  TIP: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5.2 8.2 7.1 10l3.7-3.9" />
    </>
  ),
  IMPORTANT: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.8v3.7M8 11.1v.01" />
    </>
  ),
  WARNING: (
    <>
      <path d="M8 2 14.5 13.5h-13z" />
      <path d="M8 6.5v3M8 11.6v.01" />
    </>
  ),
  CAUTION: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" />
    </>
  ),
};

export default function Alert({ type, children }) {
  const { title, color } = ALERT_TYPES[type];
  return (
    <Box role="note" aria-label={title} $color={color}>
      <Title $color={color}>
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {ICONS[type]}
        </svg>
        {title}
      </Title>
      {children}
    </Box>
  );
}
