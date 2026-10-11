import { HeaderContainer } from '@styles/layout/HeaderStyles';
import theme from '@styles/theme/theme';
import { act, render, renderHook } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, it } from 'vitest';

import useAtPageTop from './useAtPageTop';

function scrollTo(y) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

afterEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});

describe('useAtPageTop', () => {
  it('follows the scroll position', () => {
    const { result } = renderHook(() => useAtPageTop());
    expect(result.current).toBe(true);

    scrollTo(1);
    expect(result.current).toBe(false);

    scrollTo(0);
    expect(result.current).toBe(true);
  });
});

describe('HeaderContainer', () => {
  function renderHeader(atTop) {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <HeaderContainer $atTop={atTop} />
      </ThemeProvider>
    );
    return container.firstChild;
  }

  it('is opaque page color with no edge at the top', () => {
    expect(renderHeader(true)).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
      borderBottomColor: 'rgba(0, 0, 0, 0)',
    });
  });

  it('is translucent with an edge once scrolled', () => {
    expect(renderHeader(false)).toHaveStyle({
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderBottomColor: '#e0e0e0',
    });
  });

  it('draws a hairline edge', () => {
    expect(renderHeader(false)).toHaveStyle({ borderBottomWidth: '0.5px' });
  });
});
