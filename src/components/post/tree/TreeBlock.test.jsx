import PostArticle from '@components/post/PostArticle';
import theme from '@styles/theme/theme';
import { render, screen, within } from '@testing-library/react';
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

const fence = (body) => `\`\`\`tree\n${body}\n\`\`\``;

describe('TreeBlock', () => {
  it('draws a tree block as nested lists that carry their depth', () => {
    const { container } = renderArticle(
      fence('Splash\n  Create\n  Add\n    Import')
    );
    const tree = container.querySelector('[data-tree]');

    expect(container.querySelector('pre')).toBeNull();
    const [root] = within(tree).getAllByRole('listitem');
    expect(root).toHaveStyle({ '--depth': '0' });
    expect(within(root).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Import').closest('li')).toHaveStyle({
      '--depth': '2',
    });
    expect(screen.getByText('Import').closest('ul')).toHaveStyle({
      '--depth': '2',
    });
  });

  it('keeps the code and explains the error while the tree is wrong', () => {
    const { container } = renderArticle(fence('Root\n    A\n  B'));

    expect(container.querySelector('[data-tree]')).toBeNull();
    expect(container.querySelector('pre')).not.toBeNull();
    expect(
      screen.getByText(
        '트리 문법 오류 · 3번째 줄: 같은 단계의 줄과 들여쓰기가 맞지 않습니다'
      )
    ).toBeInTheDocument();
  });
});
