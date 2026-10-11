import React from 'react';
import styled from 'styled-components';

const Nav = styled.nav`
  font-size: 0.875rem;
  line-height: 1.5;
`;

const Label = styled.p`
  margin-bottom: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ink};
`;

const List = styled.ol`
  list-style: none;
  border-left: 1px solid ${({ theme }) => theme.colors.border};
`;

const Item = styled.li`
  padding-left: ${({ $level }) => ($level === 3 ? '24px' : '12px')};
  margin: 6px 0;
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
      <List>
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <Item key={heading.id} $level={heading.level}>
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
