import { pillButton } from '@components/common/pillButton';
import { useSearch } from '@components/search/SearchProvider';
import { isMacLike } from '@utils/platform';
import React from 'react';
import { FiSearch } from 'react-icons/fi';
import styled from 'styled-components';

const Button = styled.button`
  ${pillButton}
`;

const Kbd = styled.kbd`
  font-family: inherit;
  font-size: 0.65rem;
  letter-spacing: 0.5px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

export default function SearchButton() {
  const { open } = useSearch();

  return (
    <Button type="button" onClick={open} aria-label="검색 열기">
      <FiSearch size={13} aria-hidden="true" />
      <Kbd aria-hidden="true">{isMacLike ? '⌘K' : 'Ctrl K'}</Kbd>
    </Button>
  );
}
