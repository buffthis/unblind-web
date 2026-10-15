import { useEffect, useMemo, useState } from 'react';

// KaTeX, highlight.js and the diagram renderer are most of the article bundle, and most
// posts use none of them, so each is fetched the first time a post needs it and kept
// for the rest of the visit.

// remark-math only reads $$ (single dollars stay text), so $$ is the whole signal.
const MATH = /\$\$/;
// A fence opening with a language, also inside quotes and list items.
const FENCE = /^[ \t>*+\-\d.)]*(?:`{3,}|~{3,})[ \t]*([^\s`]+)/gm;
// Blocks drawn from their raw text never reach the highlighter's output.
export const PLAIN_TEXT = ['chart', 'tree', 'mermaid', 'math'];

export function neededPlugins(content) {
  const languages = Array.from(content.matchAll(FENCE), (match) => match[1]);
  return {
    math: MATH.test(content),
    code: languages.some((language) => !PLAIN_TEXT.includes(language)),
  };
}

// Each loader also pulls in the stylesheet its output needs.
const LOADERS = {
  math: () =>
    Promise.all([
      import('rehype-katex'),
      import('katex/dist/katex.min.css'),
    ]).then(([module]) => module.default),
  code: () =>
    Promise.all([
      import('rehype-highlight'),
      import('highlight.js/styles/github.css'),
    ]).then(([module]) => [module.default, { plainText: PLAIN_TEXT }]),
  // Not a rehype plugin: MermaidBlock calls it to draw each mermaid block.
  mermaid: () =>
    import('beautiful-mermaid').then((module) => module.renderMermaidSVG),
};

const pending = {};
const loaded = {};

// A failed load is forgotten, so a later post can try again.
export function loadPlugin(name) {
  if (!pending[name]) {
    pending[name] = LOADERS[name]().then(
      (plugin) => {
        loaded[name] = plugin;
        return plugin;
      },
      (error) => {
        delete pending[name];
        throw error;
      }
    );
  }
  return pending[name];
}

export function loadedPlugin(name) {
  return loaded[name] ?? null;
}

// Returns the rehype plugins after `first`, with math and code added once they have
// loaded. Until then the article renders without them: math shows as its source and
// code without colors. rehype-katex runs before rehype-highlight so highlight.js never
// sees the language-math code.
export function useRehypePlugins(content, first) {
  const { math, code } = useMemo(() => neededPlugins(content), [content]);
  const [, setLoads] = useState(0);

  useEffect(() => {
    let active = true;
    const names = [math && 'math', code && 'code'].filter(Boolean);
    names
      .filter((name) => !loadedPlugin(name))
      .forEach((name) => {
        loadPlugin(name).then(
          () => {
            if (active) setLoads((count) => count + 1);
          },
          (error) => console.error(`Failed to load the ${name} plugin:`, error)
        );
      });
    return () => {
      active = false;
    };
  }, [math, code]);

  const mathPlugin = loadedPlugin('math');
  const codePlugin = loadedPlugin('code');
  return useMemo(
    () => [...first, mathPlugin, codePlugin].filter(Boolean),
    [first, mathPlugin, codePlugin]
  );
}
