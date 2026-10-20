import theme from '@styles/theme/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
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

function renderCard(thumbnailUrl, cardTheme = theme, tags) {
  return render(
    <ThemeProvider theme={cardTheme}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <PostCard
            post={{ ...post, tags, thumbnail: { url: thumbnailUrl } }}
          />
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
  it('keeps #border out of the address and adds no second line inside the card frame', () => {
    renderCard('https://i.imgur.com/a.png#border');

    // The thumbnail box already has its own 1px frame, so a second one would read as 2px.
    const image = screen.getByAltText('글 제목');
    expect(image).toHaveAttribute('src', 'https://i.imgur.com/a.png');
    expect(image.parentElement).not.toHaveAttribute('data-border');
  });

  it('draws the thumbnail box at 16 to 9', () => {
    renderCard('https://i.imgur.com/a.png');

    // The image sits in the hover wrapper, inside the thumbnail box.
    const box = screen.getByAltText('글 제목').parentElement.parentElement;
    expect(declaredValue(box, 'aspect-ratio')).toBe('16/9');
  });

  it('rounds the thumbnail with the theme radius and starts the text where it stops curving', () => {
    // A different radius than the real one, so only reading it from the theme passes.
    const wider = { ...theme, radius: { ...theme.radius, md: '6px' } };
    renderCard('https://i.imgur.com/a.png', wider);

    const box = screen.getByAltText('글 제목').parentElement.parentElement;
    expect(declaredValue(box, 'border-radius')).toBe('6px');
    const text = screen.getByText('글 제목', { selector: 'h3' }).parentElement;
    expect(declaredValue(text, 'padding')).toBe('0px 6px');
  });

  it('draws the thumbnail box without a shadow', () => {
    renderCard('https://i.imgur.com/a.png');

    const box = screen.getByAltText('글 제목').parentElement.parentElement;
    expect(declaredValue(box, 'box-shadow')).toBe('none');
  });

  it('sits the title as close to the thumbnail as the subtitle is to the title', () => {
    renderCard('https://i.imgur.com/a.png');

    // The title gets a wider margin than the subtitle and the date because a big
    // thumbnail edge looks closer to the text than another line of text does.
    const title = screen.getByText('글 제목', { selector: 'h3' });
    expect(declaredValue(title, 'margin-top')).toBe('8.5px');
  });

  it('keeps the title and subtitle inside the padded text box', () => {
    renderCard('https://i.imgur.com/a.png');

    const text = screen.getByText('글 제목', { selector: 'h3' }).parentElement;
    expect(declaredValue(text, 'padding')).toBe('0px 8px');
    expect(text).toContainElement(screen.getByText('부제목'));
  });

  it('sets the title at 0.9rem', () => {
    renderCard('https://i.imgur.com/a.png');

    const title = screen.getByText('글 제목', { selector: 'h3' });
    expect(declaredValue(title, 'font-size')).toBe('0.9rem');
  });

  it('shows the tags of the post in place of its date', () => {
    renderCard('https://i.imgur.com/a.png', theme, ['GPU', 'Kubernetes']);

    const list = screen.getByRole('list', { name: '태그' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['GPU', 'Kubernetes']);
    expect(screen.queryByText('2026.10.01')).not.toBeInTheDocument();
    expect(document.querySelector('time')).toBeNull();
  });

  it('draws no tag line for a post without tags', () => {
    renderCard('https://i.imgur.com/a.png');

    expect(
      screen.queryByRole('list', { name: '태그' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('2026.10.01')).not.toBeInTheDocument();
  });

  it('sets a tag like the tag on the post page', () => {
    renderCard('https://i.imgur.com/a.png', theme, ['GPU']);

    const tag = screen.getByText('GPU');
    expect(declaredValue(tag, 'font-size')).toBe('11px');
    expect(declaredValue(tag, 'line-height')).toBe('19px');
    expect(declaredValue(tag, 'border-radius')).toBe('5px');
    expect(tag).toHaveStyle({ color: theme.colors.inkSoft });
  });

  it('starts the first tag at the left edge of the thumbnail, not at the text', () => {
    // A different radius than the real one, so the pull back has to follow the theme.
    const wider = { ...theme, radius: { ...theme.radius, md: '6px' } };
    renderCard('https://i.imgur.com/a.png', wider, ['GPU']);

    // The text box is padded by the radius; the tags pull back out of that padding.
    const list = screen.getByRole('list', { name: '태그' });
    expect(declaredValue(list, 'margin-left')).toBe('-6px');
  });

  it('keeps the tags to one row, so every card is as tall as the next', () => {
    renderCard('https://i.imgur.com/a.png', theme, ['GPU']);

    // A tag that does not fit wraps below the row and is clipped with it.
    const list = screen.getByRole('list', { name: '태그' });
    expect(declaredValue(list, 'max-height')).toBe('19px');
    expect(declaredValue(list, 'overflow')).toBe('hidden');
  });

  it('sets the subtitle and the tag line margins', () => {
    renderCard('https://i.imgur.com/a.png', theme, ['GPU']);

    expect(declaredValue(screen.getByText('부제목'), 'margin-top')).toBe(
      '0.75px'
    );
    expect(
      declaredValue(screen.getByRole('list', { name: '태그' }), 'margin-top')
    ).toBe('8px');
  });

  it('leaves a plain thumbnail without a border', () => {
    renderCard('https://i.imgur.com/a.png');

    const image = screen.getByAltText('글 제목');
    expect(image).toHaveAttribute('src', 'https://i.imgur.com/a.png');
    expect(image.parentElement).not.toHaveAttribute('data-border');
  });
});
