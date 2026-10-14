import { act, render, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Loading from './Loading';
import {
  createLoadingRun,
  SHOW_AFTER,
  SHOW_AT_LEAST,
  useLoadingHold,
} from './loadingRun';

describe('createLoadingRun', () => {
  it('waits before the logo appears', () => {
    const run = createLoadingRun();
    expect(run.start(1000)).toBe(SHOW_AFTER);
    run.attach();
    expect(run.start(1000 + SHOW_AFTER - 50)).toBe(50);
  });

  it('holds nothing when the logo never appeared', () => {
    const run = createLoadingRun();
    run.start(0);
    expect(run.remainingHold(SHOW_AFTER - 1)).toBe(0);
  });

  it('keeps a logo that appeared on screen for the minimum', () => {
    const run = createLoadingRun();
    run.start(0);
    expect(run.remainingHold(SHOW_AFTER + 100)).toBe(SHOW_AT_LEAST - 100);
    expect(run.remainingHold(SHOW_AFTER + SHOW_AT_LEAST + 1)).toBe(0);
  });

  it('continues the run when the next loader mounts right away', () => {
    const run = createLoadingRun();
    run.start(0);
    run.attach();
    run.detach(SHOW_AFTER + 10);
    // The lazy page chunk finished; the page now waits for its data.
    expect(run.start(SHOW_AFTER + 20)).toBe(0);
    expect(run.remainingHold(SHOW_AFTER + 100)).toBe(SHOW_AT_LEAST - 100);
  });

  it('starts over after a pause', () => {
    const run = createLoadingRun();
    run.start(0);
    run.attach();
    run.detach(50);
    expect(run.start(5000)).toBe(SHOW_AFTER);
  });

  it('stays in the run while a loader is still mounted', () => {
    const run = createLoadingRun();
    run.start(0);
    run.attach();
    // StrictMode unmounts and remounts the effects of a fresh component.
    run.detach(1);
    run.attach();
    // The next loader renders before the current one goes away.
    expect(run.start(500)).toBe(0);
    run.attach();
    run.detach(501);
    expect(run.remainingHold(SHOW_AFTER + 100)).toBe(SHOW_AT_LEAST - 100);
  });
});

describe('Loading', () => {
  it('holds the logo back through the first moments', () => {
    const { getByRole, unmount } = render(<Loading />);
    const logo = getByRole('status').firstChild;
    expect(logo.style.animationDelay).toMatch(/^\d+(\.\d+)?ms$/);
    unmount();
  });

  it('shows the logo at once when it takes over a logo already up', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(100000);
    const first = render(<Loading />);
    now.mockReturnValue(100000 + SHOW_AFTER + 300);
    const second = render(<Loading />);
    first.unmount();
    const logo = second.getAllByRole('status').at(-1).firstChild;
    expect(logo.style.animation).toBe('none');
    second.unmount();
    now.mockRestore();
  });
});

describe('useLoadingHold', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('lets content through at once when the logo never showed', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingHold(loading, { remainingHold: () => 0 }),
      { initialProps: { loading: true } }
    );
    expect(result.current).toBe(true);
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it('keeps loading until the minimum has passed', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingHold(loading, { remainingHold: () => 300 }),
      { initialProps: { loading: true } }
    );
    rerender({ loading: false });
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it('does not hold content that was ready from the start', () => {
    const { result } = renderHook(() =>
      useLoadingHold(false, { remainingHold: () => 300 })
    );
    expect(result.current).toBe(false);
  });
});
