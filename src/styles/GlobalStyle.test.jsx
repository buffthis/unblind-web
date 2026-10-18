import theme from '@styles/theme/theme';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ServerStyleSheet, ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

import GlobalStyle from './GlobalStyle';

// GlobalStyle puts nothing in jsdom's stylesheets, so read the CSS it renders on the server.
function renderedCss() {
  const sheet = new ServerStyleSheet();
  renderToString(
    sheet.collectStyles(
      <ThemeProvider theme={theme}>
        <GlobalStyle />
      </ThemeProvider>
    )
  );
  const css = sheet.getStyleTags().replace(/\s+/g, '');
  sheet.seal();
  return css;
}

describe('GlobalStyle', () => {
  it('always shows the vertical scrollbar, so no page is a scrollbar width wider than another', () => {
    expect(renderedCss()).toMatch(/html\{[^}]*overflow-y:scroll/);
  });
});
