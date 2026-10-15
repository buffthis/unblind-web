import { iconButton } from '@components/common/iconButton';
import { useSearch } from '@components/search/SearchProvider';
import React from 'react';
import { FiSearch } from 'react-icons/fi';
import styled from 'styled-components';

const Button = styled.button`
  ${iconButton}
`;

export default function SearchButton() {
  const { open } = useSearch();

  return (
    <Button type="button" onClick={open} aria-label="검색 열기">
      <FiSearch size={13} aria-hidden="true" />
    </Button>
  );
}
