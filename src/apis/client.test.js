import { describe, expect, it } from 'vitest';

import client from './client';

// Runs the client's real request pipeline and stops at the network.
async function sent(data) {
  let request;
  await client.post('/echo', data, {
    adapter: async (config) => {
      request = config;
      return { data: null, status: 200, headers: {}, config };
    },
  });
  return request;
}

describe('client', () => {
  it('sends form data as it is, so files reach the server', async () => {
    const body = new FormData();
    body.append('file', new File(['x'], 'a.png', { type: 'image/png' }));

    const request = await sent(body);

    expect(request.data).toBeInstanceOf(FormData);
    expect(request.data.get('file').name).toBe('a.png');
  });

  it('sends plain objects as JSON', async () => {
    const request = await sent({ username: 'tester' });

    expect(request.data).toBe('{"username":"tester"}');
    expect(request.headers.getContentType()).toMatch(/^application\/json/);
  });
});
