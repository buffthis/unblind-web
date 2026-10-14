import React from 'react';
import styled from 'styled-components';

import { dropIn, growDown } from './entrance';

// The label and then each item fill in from the top, starting just after the
// post title.
const TOC_START = 150;
const TOC_STEP = 45;
const TOC_STAGGERED = 15;

const itemDelay = (order) =>
  TOC_START + (Math.min(order, TOC_STAGGERED) + 1) * TOC_STEP;

const Nav = styled.nav`
  font-size: 0.875rem;
  line-height: 1.5;
`;

const Label = styled.p`
  margin-bottom: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ink};
  ${dropIn(TOC_START)}
`;

// The rule is drawn by ::before so it can grow on its own; the transparent
// border keeps the items where the real border used to put them.
const List = styled.ol`
  position: relative;
  list-style: none;
  border-left: 1px solid transparent;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -1px;
    width: 1px;
    background: ${({ theme }) => theme.colors.border};
    transform-origin: top;
    ${({ $count }) =>
      growDown(itemDelay(0), Math.min($count, TOC_STAGGERED + 1) * TOC_STEP)}
  }
`;

const Item = styled.li`
  padding-left: ${({ $level }) => ($level === 3 ? '24px' : '12px')};
  margin: 6px 0;
  ${({ $order }) => dropIn(itemDelay($order))}
`;

const TocLink = styled.a`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.ink : theme.colors.inkMuted};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};

  &:hover {
    color: ${({ theme }) => theme.colors.ink};
  }
`;

export default function PostToc({ headings, activeId }) {
  if (headings.length === 0) return null;

  return (
    <Nav aria-label="목차">
      <Label>목차</Label>
      <List $count={headings.length}>
        {headings.map((heading, index) => {
          const active = heading.id === activeId;
          return (
            <Item key={heading.id} $level={heading.level} $order={index}>
              <TocLink
                href={`#${encodeURIComponent(heading.id)}`}
                aria-current={active ? 'location' : undefined}
                $active={active}
              >
                {heading.text}
              </TocLink>
            </Item>
          );
        })}
      </List>
    </Nav>
  );
}
