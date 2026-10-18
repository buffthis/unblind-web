import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useChartData, { clearChartDataCache } from './useChartData';

const URL_A = 'https://bucket.test/data/a.json';
const DATA = { labels: ['a', 'b'], series: [{ name: 'x', values: [1, 2] }] };

function respond(body, { ok = true, status = 200 } = {}) {
  return Promise.resolve({
    ok,
    status,
    json: () =>
      body instanceof Error ? Promise.reject(body) : Promise.resolve(body),
  });
}

beforeEach(() => {
  clearChartDataCache();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useChartData', () => {
  it('has nothing to read without an address', () => {
    const { result } = renderHook(() => useChartData(undefined, { delay: 0 }));
    expect(result.current.status).toBe('idle');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is loading until the file arrives, then holds its data', async () => {
    fetch.mockReturnValue(respond(DATA));
    const { result } = renderHook(() => useChartData(URL_A, { delay: 0 }));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data).toEqual(DATA);
    expect(fetch).toHaveBeenCalledWith(URL_A);
  });

  it('reads a file once for the whole session, and shows it at once the next time', async () => {
    fetch.mockReturnValue(respond(DATA));
    const first = renderHook(() => useChartData(URL_A, { delay: 0 }));
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    first.unmount();

    const second = renderHook(() => useChartData(URL_A, { delay: 0 }));
    expect(second.result.current.status).toBe('ready');
    expect(second.result.current.data).toEqual(DATA);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sends one request when several charts name the same file at once', async () => {
    fetch.mockReturnValue(respond(DATA));
    const one = renderHook(() => useChartData(URL_A, { delay: 0 }));
    const two = renderHook(() => useChartData(URL_A, { delay: 0 }));
    await waitFor(() => expect(one.result.current.status).toBe('ready'));
    await waitFor(() => expect(two.result.current.status).toBe('ready'));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports the status of a failed response', async () => {
    fetch.mockReturnValue(respond(null, { ok: false, status: 404 }));
    const { result } = renderHook(() => useChartData(URL_A, { delay: 0 }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('HTTP 404');
  });

  it('reports a request that could not be made, such as one a CORS rule refused', async () => {
    fetch.mockImplementation(() =>
      Promise.reject(new TypeError('Failed to fetch'))
    );
    const { result } = renderHook(() => useChartData(URL_A, { delay: 0 }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(
      '주소에 연결하지 못했습니다(주소와 CORS 설정을 확인하세요)'
    );
  });

  it('reports a body that is not JSON', async () => {
    fetch.mockReturnValue(respond(new SyntaxError('Unexpected token')));
    const { result } = renderHook(() => useChartData(URL_A, { delay: 0 }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('JSON 형식이 아닙니다');
  });

  it('does not remember a failure, so the next mount tries again', async () => {
    fetch.mockReturnValueOnce(respond(null, { ok: false, status: 500 }));
    const first = renderHook(() => useChartData(URL_A, { delay: 0 }));
    await waitFor(() => expect(first.result.current.status).toBe('error'));
    first.unmount();

    fetch.mockReturnValueOnce(respond(DATA));
    const second = renderHook(() => useChartData(URL_A, { delay: 0 }));
    await waitFor(() => expect(second.result.current.status).toBe('ready'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('waits out a pause before reading, so an address typed in the editor is not read letter by letter', async () => {
    vi.useFakeTimers();
    fetch.mockReturnValue(respond(DATA));
    const { result, rerender } = renderHook(
      ({ url }) => useChartData(url, { delay: 300 }),
      { initialProps: { url: 'https://bucket.test/d' } }
    );
    rerender({ url: 'https://bucket.test/da' });
    rerender({ url: URL_A });
    expect(result.current.status).toBe('loading');
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(URL_A);
    expect(result.current.status).toBe('ready');
  });
});
