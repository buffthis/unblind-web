import React, { useState } from 'react';
import styled from 'styled-components';

const HOSTS = new Set(['github.com', 'www.github.com']);

// First path segments that are GitHub pages rather than a user or an organization.
const RESERVED = new Set([
  'about',
  'apps',
  'collections',
  'codespaces',
  'enterprise',
  'explore',
  'features',
  'issues',
  'login',
  'marketplace',
  'new',
  'notifications',
  'orgs',
  'pricing',
  'pulls',
  'search',
  'security',
  'settings',
  'site',
  'sponsors',
  'topics',
  'trending',
]);

// GitHub logins: letters, digits and single inner hyphens, at most 39 characters.
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const REPO = /^[A-Za-z0-9._-]+$/;

// Returns { owner, repo } for an https link into a user, organization or repository
// on github.com, and null for anything else. repo is null on a profile link.
export function parseGitHubLink(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) return null;

  const [owner, rawRepo] = url.pathname.split('/').filter(Boolean);
  if (!owner || RESERVED.has(owner.toLowerCase()) || !LOGIN.test(owner)) {
    return null;
  }
  const repo = rawRepo?.replace(/\.git$/, '');
  return { owner, repo: repo && REPO.test(repo) ? repo : null };
}

// `&&` lifts the rule above the article's own `a` styles.
const Chip = styled.a`
  && {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    margin: 2px 0;
    padding: 3px 8px 3px 4px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    color: ${({ theme }) => theme.colors.ink};
    text-decoration: none;
    vertical-align: middle;
  }

  &&:hover {
    background: ${({ theme }) => theme.colors.inkSurface};
  }
`;

// `&&` lifts the rule above the article's rounded `img` style.
const Avatar = styled.img`
  && {
    flex: none;
    width: 20px;
    height: 20px;
    border-radius: 4px;
  }
`;

const Label = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Comment = styled.span`
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.inkMuted};
  vertical-align: middle;
`;

// The chip is always named @owner/repo, or @owner for a profile. Link text the
// writer chose is not part of the link: it follows the chip as a gray comment,
// as in [기여 내역](url).
function GitHubChip({ href, owner, repo, children, ...rest }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const name = repo ? `@${owner}/${repo}` : `@${owner}`;
  const bare = typeof children === 'string' && children === href;

  return (
    <>
      <Chip href={href} data-github="" {...rest}>
        {!avatarFailed && (
          <Avatar
            src={`https://github.com/${owner}.png?size=40`}
            alt=""
            loading="lazy"
            onError={() => setAvatarFailed(true)}
          />
        )}
        <Label>{name}</Label>
      </Chip>
      {!bare && <Comment data-comment="">{children}</Comment>}
    </>
  );
}

export default function GitHubLink({ node: _node, href, children, ...rest }) {
  const target = parseGitHubLink(href);
  if (!target) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <GitHubChip href={href} {...target} {...rest}>
      {children}
    </GitHubChip>
  );
}
