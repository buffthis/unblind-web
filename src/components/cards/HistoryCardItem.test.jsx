import theme from '@styles/theme/theme';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

import HistoryCardItem from './HistoryCardItem';

function renderItem(props) {
  return render(
    <ThemeProvider theme={theme}>
      <HistoryCardItem
        company={{ name: '뉴빌리티', logo: { url: 'logo.png' } }}
        startDate="2024-01-01"
        {...props}
      />
    </ThemeProvider>
  );
}

describe('HistoryCardItem', () => {
  it('팀 오른쪽에 직함을 이어서 보여준다', () => {
    renderItem({ position: '백엔드 개발자', team: '플랫폼 개발팀' });

    expect(
      screen.getByText('플랫폼 개발팀 · 백엔드 개발자')
    ).toBeInTheDocument();
  });

  it('팀이나 직함 중 하나만 있으면 그것만 보여준다', () => {
    const { unmount } = renderItem({ position: '백엔드 개발자' });
    expect(screen.getByText('백엔드 개발자')).toBeInTheDocument();
    unmount();

    renderItem({ team: '플랫폼 개발팀' });
    expect(screen.getByText('플랫폼 개발팀')).toBeInTheDocument();
  });

  it('팀과 직함이 같으면 한 번만 보여준다', () => {
    renderItem({ position: '웹 개발 트랙', team: '웹 개발 트랙' });

    expect(screen.getByText('웹 개발 트랙')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('둘 다 없으면 팀 자리를 렌더링하지 않는다', () => {
    renderItem({});

    expect(screen.queryByRole('heading', { level: 4 })).not.toBeInTheDocument();
  });

  it('masked여도 팀과 직함은 보여주고 회사명은 DOM에 넣지 않는다', () => {
    const { container } = renderItem({
      masked: true,
      position: '백엔드 개발자',
      team: '플랫폼 개발팀',
    });

    expect(
      screen.getByText('플랫폼 개발팀 · 백엔드 개발자')
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent('뉴빌리티');
  });
});
