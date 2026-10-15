import theme from '@styles/theme/theme';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CodeBlock, { dropLineAnchorAfterReload } from './CodeBlock';

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
  vi.restoreAllMocks();
  delete navigator.clipboard;
  window.history.replaceState(null, '', '/');
});

function lineNumber(container, n) {
  return container.querySelectorAll('[aria-hidden="true"] button')[n - 1];
}

describe('CodeBlock', () => {
  it('has a wrap switch that starts off and wraps long lines when pressed', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb');
    const pre = container.querySelector('pre');
    const row = pre.parentElement;

    const toggle = screen.getByRole('button', {
      name: '줄바꿈',
      pressed: false,
    });
    expect(pre).toHaveStyle({ whiteSpace: 'pre' });
    expect(row).toHaveStyle({ width: 'max-content' });

    fireEvent.click(toggle);

    expect(
      screen.getByRole('button', { name: '줄바꿈', pressed: true })
    ).toBeInTheDocument();
    expect(pre).toHaveStyle({
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
    });
    expect(row).toHaveStyle({ width: '100%' });
  });

  it('gives each line number the height of its wrapped line, and the marked line follows', () => {
    // Lines 1 to 3 take 1, 2 and 1 rows once wrapped.
    const rows = [1, 2, 1];
    let call = 0;
    vi.spyOn(document, 'createRange').mockImplementation(() => {
      const count = rows[call++ % rows.length];
      return {
        setStart: () => {},
        setEnd: () => {},
        getClientRects: () =>
          Array.from({ length: count }, (_, k) => ({
            top: k * 20,
            height: 15,
            width: 10,
          })),
      };
    });
    const { container } = renderBlock('hljs language-java', 'a\nb\nc');
    expect(lineNumber(container, 2)).toHaveStyle({ height: '20px' });

    fireEvent.click(screen.getByRole('button', { name: '줄바꿈' }));

    expect(lineNumber(container, 1)).toHaveStyle({ height: '20px' });
    expect(lineNumber(container, 2)).toHaveStyle({ height: '40px' });
    expect(lineNumber(container, 3)).toHaveStyle({ height: '20px' });
    fireEvent.click(lineNumber(container, 3));
    expect(screen.getByTestId('active-line')).toHaveStyle({
      top: '76px',
      height: '20px',
    });
  });

  it('scrolls the whole row sideways, so the scrollbar spans the box under the line numbers', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb');

    const pre = container.querySelector('pre');
    const scroller = pre.parentElement.parentElement;
    expect(scroller).toHaveStyle({ overflowX: 'auto' });
    expect(scroller).toContainElement(
      container.querySelector('[aria-hidden="true"]')
    );
    expect(pre).not.toHaveStyle({ overflowX: 'auto' });
  });

  it('keeps the line numbers in place while the code scrolls under them', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb');

    expect(container.querySelector('[aria-hidden="true"]')).toHaveStyle({
      position: 'sticky',
      left: '0px',
    });
  });

  it('marks the active line behind the line numbers too', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb\nc');

    fireEvent.click(lineNumber(container, 2));

    const gutter = container.querySelector('[aria-hidden="true"]');
    expect(gutter).toContainElement(screen.getByTestId('active-line-gutter'));
    expect(screen.getByTestId('active-line-gutter')).toHaveStyle({
      top: '36px',
      height: '20px',
    });
    expect(screen.getByTestId('active-line')).toHaveStyle({ top: '36px' });
  });

  it('numbers each line without counting the trailing newline', () => {
    const { container } = renderBlock(
      'hljs language-java',
      'int a = 1;\nint b = 2;\n'
    );
    const gutter = container.querySelector('[aria-hidden="true"]');
    expect(gutter).toHaveTextContent(/^12$/);
  });

  it('counts lines inside highlighted spans', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CodeBlock>
          <code className="hljs language-js">
            <span className="hljs-keyword">const</span>
            {' a = `x\ny`;\n'}
          </code>
        </CodeBlock>
      </ThemeProvider>
    );
    const gutter = container.querySelector('[aria-hidden="true"]');
    expect(gutter).toHaveTextContent(/^12$/);
  });

  it('keeps line numbers out of the copied text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    renderBlock('hljs language-java', 'a\nb');

    fireEvent.click(screen.getByRole('button', { name: '복사' }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('a\nb'));
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

  it('marks a clicked line and links to it', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb\nc');

    fireEvent.click(lineNumber(container, 2));

    expect(window.location.hash).toMatch(/^#code-[0-9a-z]+-L2$/);
    expect(screen.getByTestId('active-line')).toHaveStyle({ top: '36px' });
  });

  it('marks the line named in the address on load', () => {
    const first = renderBlock('hljs language-java', 'a\nb\nc');
    fireEvent.click(lineNumber(first.container, 3));
    first.unmount();

    renderBlock('hljs language-java', 'a\nb\nc');

    expect(screen.getByTestId('active-line')).toHaveStyle({ top: '56px' });
  });

  it('ignores a line link that belongs to another block', () => {
    const other = renderBlock('hljs language-java', 'other');
    fireEvent.click(lineNumber(other.container, 1));
    other.unmount();

    renderBlock('hljs language-java', 'a\nb');

    expect(screen.queryByTestId('active-line')).not.toBeInTheDocument();
  });

  it('selects a range of lines with shift-click, in either direction', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb\nc\nd\ne');

    fireEvent.click(lineNumber(container, 4));
    fireEvent.click(lineNumber(container, 2), { shiftKey: true });

    expect(window.location.hash).toMatch(/^#code-[0-9a-z]+-L2-L4$/);
    expect(screen.getByTestId('active-line')).toHaveStyle({
      top: '36px',
      height: '60px',
    });
  });

  it('copies the selected lines on the copy shortcut', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb\nc\nd\ne');
    fireEvent.click(lineNumber(container, 2));
    fireEvent.click(lineNumber(container, 3), { shiftKey: true });

    const setData = vi.fn();
    const copy = createEvent.copy(document, { clipboardData: { setData } });
    fireEvent(document, copy);

    expect(setData).toHaveBeenCalledWith('text/plain', 'b\nc');
    expect(copy.defaultPrevented).toBe(true);
  });

  it('leaves the copy shortcut alone when text is selected', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb\nc');
    fireEvent.click(lineNumber(container, 2));
    const range = document.createRange();
    range.selectNodeContents(container.querySelector('pre'));
    window.getSelection().addRange(range);

    const setData = vi.fn();
    try {
      fireEvent(
        document,
        createEvent.copy(document, { clipboardData: { setData } })
      );
    } finally {
      window.getSelection().removeAllRanges();
    }

    expect(setData).not.toHaveBeenCalled();
  });

  it('keeps the copy button copying the whole block', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { container } = renderBlock('hljs language-java', 'a\nb\nc');
    fireEvent.click(lineNumber(container, 2));

    fireEvent.click(screen.getByRole('button', { name: '복사' }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('a\nb\nc'));
  });

  it('restores a range from the address on load', () => {
    const first = renderBlock('hljs language-java', 'a\nb\nc');
    fireEvent.click(lineNumber(first.container, 1));
    fireEvent.click(lineNumber(first.container, 3), { shiftKey: true });
    first.unmount();

    renderBlock('hljs language-java', 'a\nb\nc');

    expect(screen.getByTestId('active-line')).toHaveStyle({
      top: '16px',
      height: '60px',
    });
  });

  it('darkens the number of the code line under the pointer', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb\nc');
    const body = container.querySelector('pre').parentElement;

    // jsdom puts the block at top 0, so 16px padding plus one 20px line lands on line 2.
    fireEvent.mouseMove(body, { clientY: 41 });
    expect(lineNumber(container, 2)).toHaveStyle({ color: '#171717' });
    expect(lineNumber(container, 1)).toHaveStyle({ color: '#a8a8a8' });

    fireEvent.mouseLeave(body);
    expect(lineNumber(container, 2)).toHaveStyle({ color: '#a8a8a8' });
  });

  it('clears the selection on Escape', () => {
    const { container } = renderBlock('hljs language-java', 'a\nb\nc');
    fireEvent.click(lineNumber(container, 1));
    fireEvent.click(lineNumber(container, 2), { shiftKey: true });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(window.location.hash).toBe('');
    expect(screen.queryByTestId('active-line')).not.toBeInTheDocument();
  });

  describe('after a reload', () => {
    function stubNavigation(type) {
      return vi
        .spyOn(window.performance, 'getEntriesByType')
        .mockReturnValue([{ type, name: window.location.href }]);
    }

    afterEach(() => vi.restoreAllMocks());

    it('drops a line selection from the address', () => {
      window.history.replaceState(null, '', '/posts/1#code-abc-L2-L4');
      stubNavigation('reload');

      dropLineAnchorAfterReload();

      expect(window.location.hash).toBe('');
      expect(window.location.pathname).toBe('/posts/1');
    });

    it('keeps a heading link', () => {
      window.history.replaceState(null, '', '/posts/1#intro');
      stubNavigation('reload');

      dropLineAnchorAfterReload();

      expect(window.location.hash).toBe('#intro');
    });

    it('keeps the selection of a link opened fresh', () => {
      window.history.replaceState(null, '', '/posts/1#code-abc-L2');
      stubNavigation('navigate');

      dropLineAnchorAfterReload();

      expect(window.location.hash).toBe('#code-abc-L2');
    });
  });
});
