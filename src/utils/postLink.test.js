import { describe, expect, it } from 'vitest';

import { insertPostLink, parsePostLink } from './postLink';

describe('post card addresses', () => {
  it('normalizes public and local URLs without tracking parameters or anchors', () => {
    for (const url of [
      '/posts/12',
      'https://unblind.kr/posts/12/?utm_source=blog#intro',
      'http://localhost:3000/posts/12',
    ]) {
      expect(parsePostLink(url, 'http://localhost:3000')).toEqual({
        id: '12',
        href: '/posts/12',
      });
    }
  });
  it('rejects external hosts, unsafe URLs, malformed input and non-post routes', () => {
    for (const url of [
      'https://evil.test/posts/12',
      '//evil.test/posts/12',
      'javascript:alert(1)',
      '/posts/new',
      '/posts/12/edit',
      '/posts/0',
      '/posts/12\n/posts/13',
      'https://unblind.kr@evil.test/posts/12',
    ]) {
      expect(parsePostLink(url)).toBeNull();
    }
  });
  it('inserts a separate block at the selection and preserves surrounding text', () => {
    const result = insertPostLink('앞문장 선택 뒷문장', 4, 6, '/posts/12');
    expect(result.text).toBe('앞문장 \n\n```post\n/posts/12\n```\n\n 뒷문장');
    expect(result.text.slice(result.cursor)).toBe(' 뒷문장');
  });
  it('uses existing paragraph spacing without adding extra blank lines', () => {
    expect(insertPostLink('앞문장\n\n뒷문장', 5, 5, '/posts/12').text).toBe(
      '앞문장\n\n```post\n/posts/12\n```\n\n뒷문장'
    );
  });
});
