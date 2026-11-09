import { fetchMySeries, saveSeries } from '@apis/seriesApi';
import { useAuth } from '@contexts/AuthContext';
import theme from '@styles/theme/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SeriesPicker from './SeriesPicker';

vi.mock('@apis/seriesApi', () => ({
  fetchMySeries: vi.fn(),
  saveSeries: vi.fn(),
}));
vi.mock('@contexts/AuthContext', () => ({ useAuth: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ user: { id: 7 } });
});
function picker(props = {}) {
  const onChange = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={client}>
        <SeriesPicker onChange={onChange} {...props} />
      </QueryClientProvider>
    </ThemeProvider>
  );
  return { onChange, client };
}
describe('series selection in the post editor', () => {
  it('creates a series without leaving the editor and selects it', async () => {
    fetchMySeries.mockResolvedValue([]);
    saveSeries.mockResolvedValue({ id: 5, title: '새 묶음' });
    const { onChange, client } = picker();
    await waitFor(() => expect(screen.getByLabelText('시리즈')).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '새 시리즈 만들기 +' }));
    fireEvent.change(screen.getByLabelText('새 시리즈 이름'), {
      target: { value: '새 묶음' },
    });
    fireEvent.click(screen.getByRole('button', { name: '만들고 선택' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(5));
    expect(client.getQueryData(['series-list', 'mine', 7])).toMatchObject([
      { id: 5, title: '새 묶음' },
    ]);
  });
  it('preserves the selected series if the list request fails', async () => {
    fetchMySeries.mockRejectedValue(new Error('offline'));
    const { onChange } = picker({
      value: 8,
      currentSeries: { id: 8, title: '현재 시리즈' },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '현재 설정은 유지됩니다'
    );
    expect(screen.getByLabelText('시리즈')).toHaveValue('8');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('uses explicit null to remove membership', async () => {
    fetchMySeries.mockResolvedValue([{ id: 8, title: '현재 시리즈' }]);
    const { onChange } = picker({ value: 8 });
    await waitFor(() => expect(screen.getByLabelText('시리즈')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('시리즈'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });
  it('keeps the proposed title if creation fails', async () => {
    fetchMySeries.mockResolvedValue([]);
    saveSeries.mockRejectedValue(new Error('offline'));
    picker();
    fireEvent.click(screen.getByRole('button', { name: '새 시리즈 만들기 +' }));
    fireEvent.change(screen.getByLabelText('새 시리즈 이름'), {
      target: { value: '내 제목' },
    });
    fireEvent.click(screen.getByRole('button', { name: '만들고 선택' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '저장하지 못했습니다'
    );
    expect(screen.getByLabelText('새 시리즈 이름')).toHaveValue('내 제목');
  });
});
