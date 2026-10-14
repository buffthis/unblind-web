import PostArticle from '@components/post/PostArticle';
import theme from '@styles/theme/theme';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';

import { parseGitHubLink } from './GitHubLink';

function renderArticle(content) {
  return render(
    <ThemeProvider theme={theme}>
      <PostArticle content={content} />
    </ThemeProvider>
  );
}

const ISSUES =
  'https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-c/issues?q=author:xxxxxxjun';

describe('parseGitHubLink', () => {
  it.each([
    [
      ISSUES,
      { owner: 'awslabs', repo: 'amazon-kinesis-video-streams-webrtc-sdk-c' },
    ],
    [
      'https://github.com/spring-projects',
      { owner: 'spring-projects', repo: null },
    ],
    ['https://www.github.com/uber/', { owner: 'uber', repo: null }],
    [
      'https://github.com/buffthis/unblind-web.git',
      { owner: 'buffthis', repo: 'unblind-web' },
    ],
  ])('reads %s', (href, expected) => {
    expect(parseGitHubLink(href)).toEqual(expected);
  });

  it.each([
    'https://github.com/',
    'https://github.com/orgs/spring-projects/people',
    'https://github.com/settings/profile',
    'https://gist.github.com/someone/abc',
    'https://notgithub.com/awslabs',
    'http://github.com/awslabs',
    'https://github.com/bad_name',
    'not a url',
  ])('ignores %s', (href) => {
    expect(parseGitHubLink(href)).toBeNull();
  });
});

describe('GitHub links in an article', () => {
  it('turns a bare repository link into a chip named @owner/repo', () => {
    renderArticle(`기여 내역: ${ISSUES}`);

    const chip = screen.getByRole('link', {
      name: '@awslabs/amazon-kinesis-video-streams-webrtc-sdk-c',
    });
    expect(chip).toHaveAttribute('href', ISSUES);
    expect(chip).toHaveAttribute('data-github', '');
    expect(chip.querySelector('img')).toHaveAttribute(
      'src',
      'https://github.com/awslabs.png?size=40'
    );
  });

  it('names a bare profile link @owner', () => {
    renderArticle('<https://github.com/spring-projects>');

    expect(
      screen.getByRole('link', { name: '@spring-projects' })
    ).toHaveAttribute('data-github', '');
  });

  it('puts link text after the chip as a comment outside the link', () => {
    renderArticle(`[기여 내역](${ISSUES})`);

    const chip = screen.getByRole('link', {
      name: '@awslabs/amazon-kinesis-video-streams-webrtc-sdk-c',
    });
    expect(chip).toHaveAttribute('data-github', '');
    expect(chip.querySelector('img')).not.toBeNull();
    const comment = document.querySelector('[data-comment]');
    expect(comment).toHaveTextContent('기여 내역');
    expect(chip).not.toContainElement(comment);
  });

  it('adds no comment to a bare link', () => {
    renderArticle(ISSUES);

    expect(document.querySelector('[data-comment]')).toBeNull();
  });

  it('drops the avatar when it fails to load', () => {
    renderArticle('https://github.com/spring-projects');

    const chip = screen.getByRole('link', { name: '@spring-projects' });
    fireEvent.error(chip.querySelector('img'));
    expect(chip.querySelector('img')).toBeNull();
  });

  it('leaves other links as plain links', () => {
    renderArticle('[블로그](https://example.com) https://github.com/settings');

    expect(screen.getByRole('link', { name: '블로그' })).not.toHaveAttribute(
      'data-github'
    );
    expect(
      screen.getByRole('link', { name: 'https://github.com/settings' })
    ).not.toHaveAttribute('data-github');
  });
});
