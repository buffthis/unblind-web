import { describe, expect, it } from 'vitest';

import { loadedPlugin, loadPlugin, neededPlugins } from './markdownPlugins';

describe('neededPlugins', () => {
  it.each([
    ['plain text with $5 and $10', { math: false, code: false }],
    ['inline $$x^2$$ math', { math: true, code: false }],
    ['$$\n\\frac{a}{b}\n$$', { math: true, code: false }],
    ['```java\nint a;\n```', { math: false, code: true }],
    ['~~~ts\nlet a;\n~~~', { math: false, code: true }],
    ['> ```js\n> a\n> ```', { math: false, code: true }],
    ['- ```bash\n  ls\n  ```', { math: false, code: true }],
    ['```chart\n월, a\n1월, 1\n```', { math: false, code: false }],
    ['```tree\na/\n```', { math: false, code: false }],
    ['```\nno language\n```', { math: false, code: false }],
    ['`inline` code only', { math: false, code: false }],
  ])('reads %j as %j', (content, expected) => {
    expect(neededPlugins(content)).toEqual(expected);
  });
});

describe('loadPlugin', () => {
  it('loads each plugin once and keeps it for later renders', async () => {
    expect(loadedPlugin('code')).toBeNull();
    const first = loadPlugin('code');
    expect(loadPlugin('code')).toBe(first);
    await first;
    expect(loadedPlugin('code')).not.toBeNull();
  });
});
