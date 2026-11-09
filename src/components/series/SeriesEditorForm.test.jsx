import { deleteSeries, saveSeries } from '@apis/seriesApi';
import theme from '@styles/theme/theme';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SeriesEditorForm from './SeriesEditorForm';

vi.mock('@apis/seriesApi', () => ({
  deleteSeries: vi.fn(),
  saveSeries: vi.fn(),
}));
const a = { id: 1, title: '처음' };
const b = { id: 2, title: '다음', hidden: true };
const data = {
  id: 7,
  version: 2,
  title: '시리즈',
  description: '소개',
  color: 'sage',
  posts: [a, b],
};
function form(props = {}) {
  const onSaved = vi.fn();
  const onDeleted = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <SeriesEditorForm
        series={data}
        candidates={[a, b, { id: 3, title: '추가할 글' }]}
        onSaved={onSaved}
        onDeleted={onDeleted}
        {...props}
      />
    </ThemeProvider>
  );
  return { onSaved, onDeleted };
}
beforeEach(() => vi.resetAllMocks());
describe('series management', () => {
  it('reorders and adds posts, then saves their exact reading order', async () => {
    saveSeries.mockResolvedValue(data);
    const { onSaved } = form();
    fireEvent.click(screen.getByRole('button', { name: '다음 위로 이동' }));
    fireEvent.click(screen.getByRole('button', { name: '+ 추가할 글' }));
    fireEvent.click(screen.getByRole('button', { name: '시리즈 저장' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(data));
    expect(
      saveSeries.mock.calls[0][0].values.posts.map((post) => post.id)
    ).toEqual([2, 1, 3]);
    expect(saveSeries.mock.calls[0][0].values.version).toBe(2);
  });
  it('removes membership without deleting a post', async () => {
    saveSeries.mockResolvedValue(data);
    form();
    fireEvent.click(
      screen.getByRole('button', { name: '처음 시리즈에서 제외' })
    );
    fireEvent.click(screen.getByRole('button', { name: '시리즈 저장' }));
    await waitFor(() => expect(saveSeries).toHaveBeenCalled());
    expect(
      saveSeries.mock.calls[0][0].values.posts.map((post) => post.id)
    ).toEqual([2]);
    expect(deleteSeries).not.toHaveBeenCalled();
  });
  it('keeps changes when a save conflicts with a newer server revision', async () => {
    saveSeries.mockRejectedValue({ response: { status: 409 } });
    form();
    fireEvent.change(screen.getByLabelText('시리즈 이름'), {
      target: { value: '내가 바꾼 이름' },
    });
    fireEvent.click(screen.getByRole('button', { name: '시리즈 저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '다른 곳에서 시리즈가 변경되었습니다'
    );
    expect(screen.getByLabelText('시리즈 이름')).toHaveValue('내가 바꾼 이름');
  });
  it('requires a separate deletion action and explains that posts stay', async () => {
    deleteSeries.mockResolvedValue();
    const { onDeleted } = form();
    fireEvent.click(screen.getByRole('button', { name: '시리즈 삭제' }));
    const confirmation = screen.getByRole('region', {
      name: '시리즈 삭제 확인',
    });
    expect(confirmation).toHaveTextContent('포함된 글은 삭제되지 않습니다');
    expect(deleteSeries).not.toHaveBeenCalled();
    fireEvent.click(
      within(confirmation).getByRole('button', { name: '시리즈만 삭제' })
    );
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(deleteSeries).toHaveBeenCalledWith(7);
  });
  it('excludes other series from the candidate list and labels hidden chapters', () => {
    form({
      candidates: [{ id: 3, title: '다른 시리즈의 글', series: { id: 9 } }],
    });
    expect(
      screen.queryByRole('button', { name: /다른 시리즈의 글/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText('숨긴 글 · 나에게만 표시')).toBeInTheDocument();
  });
});
