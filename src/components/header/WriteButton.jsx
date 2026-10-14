import { pillButton } from '@components/common/pillButton';
import { useAuth } from '@contexts/AuthContext';
import React from 'react';
import { FiEdit3 } from 'react-icons/fi';
import { Link, matchPath, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { POST_EDITOR_ENABLED } from '@/config';

const WriteLink = styled(Link)`
  ${pillButton}
  text-decoration: none;
`;

// Narrow screens keep the icon only, as the search button drops its shortcut.
const Label = styled.span`
  font-size: 0.75rem;
  /* Keeps the pill at the search button's height. */
  line-height: 1;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const EDITOR_PATHS = ['/posts/new', '/posts/:postId/edit'];

export default function WriteButton() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const inEditor = EDITOR_PATHS.some((path) => matchPath(path, pathname));
  if (!POST_EDITOR_ENABLED || !user || inEditor) return null;

  return (
    <WriteLink to="/posts/new" aria-label="글쓰기">
      <FiEdit3 size={13} aria-hidden="true" />
      <Label aria-hidden="true">글쓰기</Label>
    </WriteLink>
  );
}
