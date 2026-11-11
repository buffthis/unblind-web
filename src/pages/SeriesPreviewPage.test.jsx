import theme from '@styles/theme/theme';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { expect, it } from 'vitest';

import SeriesPreviewPage from './SeriesPreviewPage';

it('keeps sample chapter links inside the preview rather than requesting non-existent posts', () => {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/__preview/series']}>
        <Routes>
          <Route path="/__preview/series" element={<SeriesPreviewPage />} />
          <Route path="*" element={<p>샘플 밖으로 나감</p>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
  expect(
    screen.queryByRole('button', { name: '시리즈 소개' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '글에서 보기' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '시리즈 목록' })
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: '이전 글: 작게 시작하기' }));
  expect(
    screen.getByRole('heading', { level: 1, name: '작게 시작하기' })
  ).toBeInTheDocument();
  const continuation = screen.getByRole('navigation', {
    name: '시리즈 이어 읽기',
  });
  fireEvent.click(
    within(continuation).getByRole('link', { name: /다음 글.*느린 페이지/ })
  );
  expect(
    screen.getByRole('heading', { level: 1, name: '느린 페이지에서 찾은 단서' })
  ).toBeInTheDocument();
  expect(screen.queryByText('샘플 밖으로 나감')).not.toBeInTheDocument();
});
