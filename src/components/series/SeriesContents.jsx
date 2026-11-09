import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
`;
const Row = styled.li`
  & + & {
    margin-top: ${({ $compact }) => ($compact ? '4px' : '0')};
  }
  ${({ $compact, theme }) =>
    !$compact && `border-bottom: 1px solid ${theme.colors.inkSurface};`}
`;
const Entry = styled(Link)`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: ${({ $compact }) => ($compact ? '12px 10px' : '22px 0')};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.ink};
  background: ${({ $current, theme }) =>
    $current ? theme.colors.inkSurface : 'transparent'};
  font-size: ${({ $compact }) => ($compact ? '13px' : '15px')};
  line-height: 1.65;
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.inkSurface};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`;
const Number = styled.span`
  font-size: 11px;
  padding-top: 3px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.inkSoft};
`;
const Title = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 500;
`;
const Summary = styled.span`
  display: block;
  font-size: 13px;
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-weight: 400;
`;
const Current = styled.span`
  font-size: 10px;
  padding-top: 3px;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.inkSub};
`;

export default function SeriesContents({
  posts,
  currentPostId,
  compact = false,
}) {
  return (
    <List aria-label="시리즈 회차">
      {posts.map((post, index) => {
        const current = String(post.id) === String(currentPostId);
        return (
          <Row key={post.id} $compact={compact}>
            <Entry
              to={`/posts/${post.id}`}
              $current={current}
              $compact={compact}
              aria-current={current ? 'page' : undefined}
            >
              <Number>{String(index + 1).padStart(2, '0')}</Number>
              <Title>
                {post.title}
                {!compact && post.subtitle && (
                  <Summary>{post.subtitle}</Summary>
                )}
              </Title>
              {current && <Current>현재 글</Current>}
            </Entry>
          </Row>
        );
      })}
    </List>
  );
}
