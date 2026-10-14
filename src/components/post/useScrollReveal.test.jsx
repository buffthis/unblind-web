import theme from '@styles/theme/theme';
import { act, render } from '@testing-library/react';
import { useReducedMotion } from 'framer-motion';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostArticle from './PostArticle';
import { syncBlocks } from './useScrollReveal';

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal()),
  useReducedMotion: vi.fn(),
}));

// jsdom has no layout, so each block reports the top it was given.
function blocksAt(tops, shown = []) {
  const root = document.createElement('div');
  tops.forEach((top, index) => {
    const block = document.createElement('p');
    block.getBoundingClientRect = () => ({ top });
    if (shown.includes(index)) block.setAttribute('data-shown', '');
    root.appendChild(block);
  });
  return root;
}

const shownIndexes = (root) =>
  Array.from(root.children).flatMap((block, index) =>
    block.hasAttribute('data-shown') ? [index] : []
  );

describe('syncBlocks', () => {
  it('shows blocks above the reveal line and hides those below it', () => {
    // The line sits at 92% of an 800px viewport, 736px.
    const root = blocksAt([-500, 100, 700, 750, 1200], [3, 4]);
    syncBlocks(root, 800);
    expect(shownIndexes(root)).toEqual([0, 1, 2]);
  });

  it('settles blocks a fast scroll skipped in either direction', () => {
    const down = blocksAt([-1400, -900, 200]);
    syncBlocks(down, 800);
    expect(shownIndexes(down)).toEqual([0, 1, 2]);

    const up = blocksAt([200, 1300, 1900], [0, 1, 2]);
    syncBlocks(up, 800);
    expect(shownIndexes(up)).toEqual([0]);
  });

  const delays = (root) =>
    Array.from(root.children).map((block) =>
      block.style.getPropertyValue('--reveal-delay')
    );

  it('staggers the blocks an entrance shows, up to a cap', () => {
    const root = blocksAt([0, 100, 200, 300, 400, 900]);
    syncBlocks(root, 800, { start: 250, step: 50, max: 350 });
    expect(delays(root)).toEqual([
      '250ms',
      '300ms',
      '350ms',
      '350ms',
      '350ms',
      '',
    ]);
  });

  it('drops the entrance delays on later syncs', () => {
    const root = blocksAt([0, 100]);
    syncBlocks(root, 800, { start: 250, step: 50, max: 350 });
    syncBlocks(root, 800);
    expect(delays(root)).toEqual(['', '']);
  });
});

describe('PostArticle reveal', () => {
  const observed = [];
  const original = window.IntersectionObserver;

  beforeEach(() => {
    observed.length = 0;
    useReducedMotion.mockReset().mockReturnValue(false);
    window.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(target) {
        observed.push({ target, callback: this.callback });
      }
      disconnect() {}
    };
  });

  afterEach(() => {
    window.IntersectionObserver = original;
  });

  function renderArticle(props) {
    return render(
      <ThemeProvider theme={theme}>
        <PostArticle content={'첫 문단\n\n## 제목'} {...props} />
      </ThemeProvider>
    );
  }

  it('observes every top-level block and syncs them when told to look', () => {
    const { container } = renderArticle({ reveal: true });
    const body = container.firstChild;

    expect(body).toHaveAttribute('data-reveal');
    expect(observed.map(({ target }) => target.tagName)).toEqual(['P', 'H2']);
    const [{ target, callback }] = observed;
    act(() => callback([]));
    expect(target).toHaveAttribute('data-shown');
  });

  it('staggers only the first sync when given an entrance', () => {
    const entrance = { start: 250, step: 50, max: 450 };
    renderArticle({ reveal: true, entrance });
    const [{ target, callback }] = observed;
    act(() => callback([]));
    expect(target.style.getPropertyValue('--reveal-delay')).toBe('250ms');
    act(() => callback([]));
    expect(target.style.getPropertyValue('--reveal-delay')).toBe('');
  });

  it('stays off without the prop, as in the editor preview', () => {
    const { container } = renderArticle();
    expect(container.firstChild).not.toHaveAttribute('data-reveal');
    expect(observed).toHaveLength(0);
  });

  it('stays off when the reader asks for reduced motion', () => {
    useReducedMotion.mockReturnValue(true);
    const { container } = renderArticle({ reveal: true });
    expect(container.firstChild).not.toHaveAttribute('data-reveal');
    expect(observed).toHaveLength(0);
  });
});
