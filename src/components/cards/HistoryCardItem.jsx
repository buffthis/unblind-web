import { blackSquare } from '@assets/images';
import {
  ContentWrapper,
  HistoryCard,
  HistoryDescription,
  HistoryPeriod,
  HistoryTitle,
  Position,
  TitleWrapper,
} from '@styles/compositions/Card.styles';
import { SquareImage } from '@styles/ImageStyles';
import formatYearMonth, {
  getPeriodLength,
  withParentheses,
} from '@utils/format';
import React from 'react';
import styled from 'styled-components';

const MaskedTitle = styled(HistoryTitle)`
  background: #000;
  color: #000;
  overflow: hidden;
  border-radius: 2px;
  user-select: none;
`;

// 데이터에 팀과 직함이 같은 값으로 들어온 경력이 있어 같으면 한 번만 보여준다.
function formatRole(team, position) {
  if (team && position && team !== position) return `${team} · ${position}`;
  return team || position || '';
}

export default function HistoryCardItem({
  company,
  position,
  team,
  startDate,
  endDate,
  periodNote,
  description,
  masked,
}) {
  const companyName = company?.name || '';
  const role = formatRole(team, position);

  return (
    <HistoryCard>
      <SquareImage
        src={masked ? blackSquare : company?.logo?.url}
        alt={masked ? '' : companyName}
      />
      <ContentWrapper>
        <TitleWrapper>
          {masked ? (
            // 회사명을 DOM에 노출하지 않고 자리표시자만 렌더링한다.
            <MaskedTitle aria-label="비공개 회사">████</MaskedTitle>
          ) : (
            <HistoryTitle>{companyName}</HistoryTitle>
          )}
          {/* 마스킹은 회사를 가리려는 것이지 직무를 가리려는 것이 아니므로 masked여도 보여준다. */}
          {role && <Position>{role}</Position>}
        </TitleWrapper>
        <HistoryDescription>{description}</HistoryDescription>
        <HistoryPeriod>
          {formatYearMonth(startDate)} -{' '}
          {endDate ? formatYearMonth(endDate) : '재직 중'}{' '}
          {withParentheses(
            periodNote ? periodNote : getPeriodLength(startDate, endDate)
          )}
        </HistoryPeriod>
      </ContentWrapper>
    </HistoryCard>
  );
}
