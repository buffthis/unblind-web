import theme from '@styles/theme/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

import PostCard from './PostCard';

const post = {
  id: 3,
  title: '글 제목',
  subtitle: '부제목',
  createdAt: '2026-10-01T09:00:00',
};

function renderCard(thumbnailUrl) {
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <PostCard post={{ ...post, thumbnail: { url: thumbnailUrl } }} />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// jsdom does not compute aspect-ratio, so read what the stylesheet declares for the element.
function declaredValue(element, property) {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule.selectorText && element.matches(rule.selectorText)) {
        const value = rule.style.getPropertyValue(property);
        if (value) return value;
      }
    }
  }
  return null;
}

describe('PostCard', () => {
  it('draws a bordered thumbnail without #border in its address', () => {
    renderCard('https://i.imgur.com/a.png#border');

    const image = screen.getByAltText('글 제목');
    expect(image).toHaveAttribute('src', 'https://i.imgur.com/a.png');
    expect(image.parentElement).toHaveAttribute('data-border');
  });

  it('draws the thumbnail box at 16 to 9', () => {
    renderCard('https://i.imgur.com/a.png');

    // The image sits in the hover wrapper, inside the thumbnail box.
    const box = screen.getByAltText('글 제목').parentElement.parentElement;
    expect(declaredValue(box, 'aspect-ratio')).toBe('16/9');
  });

  it('leaves a plain thumbnail without a border', () => {
    renderCard('https://i.imgur.com/a.png');

    const image = screen.getByAltText('글 제목');
    expect(image).toHaveAttribute('src', 'https://i.imgur.com/a.png');
    expect(image.parentElement).not.toHaveAttribute('data-border');
  });
});
