import { useEffect, useState } from 'react';

// A data file is named with a random id, so what an address holds never changes. A file
// read once is kept for the session, and a read already on its way is shared.
const loaded = new Map();
const pending = new Map();

const CONNECT_ERROR =
  '주소에 연결하지 못했습니다(주소와 CORS 설정을 확인하세요)';

export function clearChartDataCache() {
  loaded.clear();
  pending.clear();
}

function read(url) {
  if (loaded.has(url)) return Promise.resolve(loaded.get(url));
  if (pending.has(url)) return pending.get(url);
  const request = fetch(url).then(
    async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('JSON 형식이 아닙니다');
      }
      loaded.set(url, data);
      return data;
    },
    () => {
      throw new Error(CONNECT_ERROR);
    }
  );
  pending.set(url, request);
  // A failure is dropped here, so the next try asks again.
  const done = () => pending.delete(url);
  request.then(done, done);
  return request;
}

// The state of the file at `url`: idle without an address, loading while it is read, then
// ready with its data or error with the reason. A file not read before waits `delay` ms
// first, so an address typed into the editor is not read for each letter. The state is
// worked out from what is kept and from the last answer, so it never lags an address
// that has just changed.
export default function useChartData(url, { delay = 300 } = {}) {
  const [answer, setAnswer] = useState({ url: null });

  useEffect(() => {
    if (!url || loaded.has(url)) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      read(url).then(
        (data) => active && setAnswer({ url, status: 'ready', data }),
        (error) =>
          active && setAnswer({ url, status: 'error', error: error.message })
      );
    }, delay);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [url, delay]);

  if (!url) return { status: 'idle' };
  if (loaded.has(url)) return { status: 'ready', data: loaded.get(url) };
  if (answer.url === url) return answer;
  return { status: 'loading' };
}
