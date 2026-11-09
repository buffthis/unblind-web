import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import { Muted } from './seriesStyles';

const List = styled.div`
  margin-top: 24px;
`;
const Card = styled(Link)`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 20px;
  gap: 22px;
  align-items: center;
  padding: 24px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.inkSurface};
  &:hover h3 {
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 4px;
  }
`;
const Cover = styled.div`
  height: 82px;
  padding: 12px 8px;
  border-radius: 2px 5px 5px 2px;
  border-left: 4px solid ${({ theme }) => theme.colors.inkMuted};
  background: ${({ $color, theme }) =>
    ({
      slate: theme.colors.seriesSlate,
      sage: theme.colors.seriesSage,
      sand: theme.colors.seriesSand,
    })[$color] || theme.colors.seriesSlate};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.colors.inkSub};
  span:last-child {
    font-size: 18px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
  }
`;
const Info = styled.div`
  min-width: 0;
  h3 {
    margin: 0;
    font-size: 17px;
    line-height: 1.5;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.ink};
    overflow-wrap: anywhere;
  }
  p {
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.7;
    color: ${({ theme }) => theme.colors.inkSoft};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  small {
    display: block;
    margin-top: 10px;
    font-size: 11px;
    color: ${({ theme }) => theme.colors.inkSoft};
  }
`;
const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.inkMuted};
`;

export default function SeriesCollection({ series, editable = false }) {
  if (!series.length) return <Muted>아직 공개된 시리즈가 없습니다.</Muted>;
  return (
    <List>
      {series.map((item) => (
        <Card
          key={item.id}
          to={editable ? `/series/${item.id}/edit` : `/series/${item.id}`}
        >
          <Cover $color={item.color} aria-hidden="true">
            <span>SERIES</span>
            <span>{String(item.postCount).padStart(2, '0')}</span>
          </Cover>
          <Info>
            <h3>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
            <small>
              {item.postCount > 0
                ? `${item.postCount}편 공개`
                : '공개된 글 없음 · 나에게만 표시'}
            </small>
          </Info>
          <Arrow aria-hidden="true">↗</Arrow>
        </Card>
      ))}
    </List>
  );
}
