import BlockErrorNote from '@components/post/BlockErrorNote';
import CodeBlock from '@components/post/CodeBlock';
import { loadedPlugin, loadPlugin } from '@components/post/markdownPlugins';
import React, { useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';

// The renderer names the font in an @import from Google Fonts, which has no
// Pretendard and answers 400. The diagram uses whatever font the page has.
const FONT_IMPORT = /@import url\([^)]*\);?/g;

const Figure = styled.div`
  margin: 24px 0 8px;
  overflow-x: auto;

  svg {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 0 auto;
  }

  /* Same hairline as a bordered image. */
  &[data-border] {
    padding: 16px;
    border: 1px solid #ececec;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

function draw(render, source, theme) {
  try {
    const svg = render(source, {
      fg: theme.colors.ink,
      // The default edge label grey is too faint to read on white.
      muted: theme.colors.inkSoft,
      line: theme.colors.inkMuted,
      font: 'Pretendard Variable',
      transparent: true,
    });
    return { ok: true, svg: svg.replace(FONT_IMPORT, '') };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// The renderer escapes every label and attribute it writes, so the SVG it returns
// holds no markup from the post and is safe to insert as HTML.
export default function MermaidBlock({ source, bordered = false, children }) {
  const theme = useTheme();
  const [render, setRender] = useState(() => loadedPlugin('mermaid'));

  useEffect(() => {
    if (render) return undefined;
    let active = true;
    loadPlugin('mermaid').then(
      (loaded) => {
        if (active) setRender(() => loaded);
      },
      (error) => console.error('Failed to load the mermaid renderer:', error)
    );
    return () => {
      active = false;
    };
  }, [render]);

  const result = useMemo(
    () => (render ? draw(render, source, theme) : null),
    [render, source, theme]
  );

  // Until the renderer arrives, and when it cannot draw the block, the source shows.
  if (!result) return <CodeBlock>{children}</CodeBlock>;
  if (!result.ok) {
    return (
      <>
        <CodeBlock>{children}</CodeBlock>
        <BlockErrorNote>{`다이어그램 문법 오류 · ${result.error}`}</BlockErrorNote>
      </>
    );
  }
  return (
    <Figure
      data-diagram=""
      data-border={bordered ? '' : undefined}
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
  );
}
