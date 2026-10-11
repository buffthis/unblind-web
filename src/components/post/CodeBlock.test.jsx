import theme from '@styles/theme/theme';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CodeBlock from './CodeBlock';

function renderBlock(className, text = 'int a = 1;') {
  return render(
    <ThemeProvider theme={theme}>
      <CodeBlock>
        <code className={className}>{text}</code>
      </CodeBlock>
    </ThemeProvider>
  );
}

function stubClipboard(writeText) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

afterEach(() => {
  delete navigator.clipboard;
});

describe('CodeBlock', () => {
  it('shows the language from the code class name', () => {
    renderBlock('hljs language-java');
    expect(screen.getByText('java')).toBeInTheDocument();
  });

  it('shows no language label for plain blocks', () => {
    renderBlock(undefined);
    expect(screen.queryByText('java')).not.toBeInTheDocument();
  });

  it('copies the code text and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    renderBlock('hljs language-java');

    fireEvent.click(screen.getByRole('button', { name: '복사' }));

    expect(
      await screen.findByRole('button', { name: '복사됨' })
    ).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('int a = 1;');
  });

  it('keeps working when the clipboard is unavailable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderBlock('hljs language-java');

    fireEvent.click(screen.getByRole('button', { name: '복사' }));

    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: '복사' })).toBeInTheDocument();
    error.mockRestore();
  });
});
