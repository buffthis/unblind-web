import PostArticle from '@components/post/PostArticle';
import theme from '@styles/theme/theme';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

function renderArticle(content) {
  return render(
    <ThemeProvider theme={theme}>
      <PostArticle content={content} />
    </ThemeProvider>
  );
}

const fence = (body) => `\`\`\`timeline\n${body}\n\`\`\``;

const SOURCE = [
  'title: 사건 경위',
  '---',
  '# 월요일',
  '밤 | change | 새 지도 적용',
  '# 화요일',
  '점심 | problem! | 같은 보도에서 반복 정지',
  '  안전 정지가 반복됐습니다.',
  '  [안전 정지 17회]',
  '13:52 | recovery | 지도 롤백',
  '~ 97분 뒤',
].join('\n');

describe('TimelineBlock', () => {
  it('draws a timeline block as a timeline instead of a code box', () => {
    const { container } = renderArticle(
      fence(SOURCE.replace('\n~ 97분 뒤', ''))
    );

    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('[data-timeline]')).not.toBeNull();
    expect(
      screen.getByRole('heading', { level: 3, name: '사건 경위' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    ).toEqual(['월요일', '화요일']);
    expect(screen.getByText('13:52')).toBeInTheDocument();
  });

  it('opens an event that has a description and tags', () => {
    renderArticle(fence(SOURCE.replace('\n~ 97분 뒤', '')));
    const button = screen.getByRole('button', {
      name: '같은 보도에서 반복 정지',
    });
    expect(screen.getByText('안전 정지가 반복됐습니다.')).not.toBeVisible();

    fireEvent.click(button);
    expect(screen.getByText('안전 정지가 반복됐습니다.')).toBeVisible();
    expect(screen.getByText('안전 정지 17회')).toBeVisible();
  });

  it('applies the hide and gapmin settings', () => {
    renderArticle(
      fence(
        [
          'hide: day, time',
          'gapmin: 0',
          '---',
          '2026-10-27 12:00 | note | 하나',
          '2026-10-27 12:30 | note | 둘',
        ].join('\n')
      )
    );
    expect(screen.queryByRole('heading', { level: 4 })).toBeNull();
    expect(screen.queryByText('12:00')).toBeNull();
    expect(screen.getByText('30분 뒤')).toBeInTheDocument();
  });

  it('keeps the code and explains the error while the block is wrong', () => {
    const { container } = renderArticle(fence('# 월요일\n12:15 response 차단'));

    expect(container.querySelector('[data-timeline]')).toBeNull();
    expect(container.querySelector('pre')).not.toBeNull();
    expect(
      screen.getByText(
        '타임라인 문법 오류 · 2번째 줄: 이벤트 줄은 "시각 | 종류 | 제목" 형식이어야 합니다(예: 12:15 | response | 구간 차단)'
      )
    ).toBeInTheDocument();
  });

  it('shows the error for a gap line that has no event after it', () => {
    renderArticle(fence(SOURCE));
    expect(
      screen.getByText(
        '타임라인 문법 오류 · 10번째 줄: ~ 줄 다음에는 이벤트 줄이 와야 합니다'
      )
    ).toBeInTheDocument();
  });

  it('is not run through the code highlighter', () => {
    const { container } = renderArticle(
      `${fence('| | 하나')}\n\n\`\`\`js\nconst a = 1;\n\`\`\``
    );
    expect(container.querySelector('[data-timeline]')).not.toBeNull();
    expect(container.querySelectorAll('pre')).toHaveLength(1);
  });
});
