import PostArticle from '@components/post/PostArticle';
import theme from '@styles/theme/theme';
import { render, screen, waitFor } from '@testing-library/react';
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

const fence = (body) => `\`\`\`mermaid\n${body}\n\`\`\``;

describe('MermaidBlock', () => {
  it('draws a mermaid block as a diagram once the renderer has loaded', async () => {
    const { container } = renderArticle(
      fence('flowchart TD\n  A[글쓰기] --> B{로그인?}')
    );

    const svg = await waitFor(() => {
      const found = container.querySelector('[data-diagram] svg');
      expect(found).not.toBeNull();
      return found;
    });
    expect(container.querySelector('pre')).toBeNull();
    expect(svg).toHaveTextContent('글쓰기');
  });

  it('frames the diagram when the fence says border', async () => {
    const { container } = renderArticle(
      '```mermaid border\nflowchart LR\n  A --> B\n```'
    );

    const figure = await waitFor(() => {
      const found = container.querySelector('[data-diagram]');
      expect(found).not.toBeNull();
      return found;
    });
    expect(figure).toHaveAttribute('data-border');
    expect(figure).toHaveStyle({ border: '1px solid #ececec' });
  });

  it('leaves the diagram unframed without border, and ignores other words', async () => {
    const { container } = renderArticle(
      `${fence('flowchart LR\n  A --> B')}\n\n\`\`\`mermaid bordered\nflowchart LR\n  C --> D\n\`\`\``
    );

    await waitFor(() =>
      expect(container.querySelectorAll('[data-diagram]')).toHaveLength(2)
    );
    for (const figure of container.querySelectorAll('[data-diagram]')) {
      expect(figure).not.toHaveAttribute('data-border');
    }
  });

  it('draws sequence diagrams too', async () => {
    const { container } = renderArticle(
      fence('sequenceDiagram\n  브라우저->>API: POST /posts')
    );

    await waitFor(() =>
      expect(container.querySelector('[data-diagram] svg')).not.toBeNull()
    );
  });

  it('never makes the diagram fetch web fonts', async () => {
    const { container } = renderArticle(fence('flowchart LR\n  A --> B'));

    const figure = await waitFor(() => {
      const found = container.querySelector('[data-diagram]');
      expect(found).not.toBeNull();
      return found;
    });
    expect(figure.innerHTML).not.toContain('@import');
  });

  it('keeps labels as text, so markup in them never runs', async () => {
    const { container } = renderArticle(
      fence('flowchart TD\n  A["<img src=x onerror=alert(1)>"] --> B')
    );

    await waitFor(() =>
      expect(container.querySelector('[data-diagram] svg')).not.toBeNull()
    );
    expect(container.querySelector('[data-diagram] img')).toBeNull();
  });

  it('keeps the code and explains the error while the diagram is wrong', async () => {
    const { container } = renderArticle(fence('not a diagram'));

    expect(
      await screen.findByText(/^다이어그램 문법 오류 · /)
    ).toBeInTheDocument();
    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.querySelector('[data-diagram]')).toBeNull();
  });
});
