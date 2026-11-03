import React from 'react';
import styled from 'styled-components';

export const WIP_LABEL = '작성 중';

const Chip = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  /* Dashed, so "unfinished" reads even without the label. */
  border: 1px dashed ${({ theme }) => theme.colors.inkMuted};
  border-radius: 5px;
  background: #e5e8eb;
  font-size: 11px;
  font-weight: 560;
  line-height: 17px;
  color: ${({ theme }) => theme.colors.inkSub};
  white-space: nowrap;

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.inkMuted};
  }
`;

// The post list shows only this chip, like a "coming soon" label that appears in the
// sidebar alone. The full explanation waits on the post page.
export function WipBadge({ className }) {
  return <Chip className={className}>{WIP_LABEL}</Chip>;
}

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px 12px;
  margin: 0 0 24px;
  padding: 12px 16px;
  border: 1px dashed ${({ theme }) => theme.colors.inkMuted};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inkSurface};
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.inkSub};
`;

const Text = styled.div`
  flex: 1 1 240px;
  min-width: 0;

  p {
    margin: 0;
  }
`;

const Missing = styled.ul`
  margin: 6px 0 0;
  padding-left: 18px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

// Page level status for a published post that is not finished. `missing` names the parts
// that are still empty, so a reader can tell which sections to trust and which to skip.
export default function WipBanner({ updatedAt, missing = [] }) {
  return (
    <Bar role="note" aria-label={WIP_LABEL}>
      <WipBadge />
      <Text>
        <p>
          이 글은 아직 작성 중입니다. 내용이 바뀌거나 빠져 있을 수 있습니다.
          {updatedAt && ` 마지막 수정 ${updatedAt}`}
        </p>
        {missing.length > 0 && (
          <Missing aria-label="아직 비어 있는 부분">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </Missing>
        )}
      </Text>
    </Bar>
  );
}
