import { iconButton } from '@components/common/iconButton';
import { useAuth } from '@contexts/AuthContext';
import React from 'react';
import { FiEdit3 } from 'react-icons/fi';
import { Link, matchPath, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { POST_EDITOR_ENABLED } from '@/config';

const WriteLink = styled(Link)`
  ${iconButton}
  text-decoration: none;
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
    </WriteLink>
  );
}
