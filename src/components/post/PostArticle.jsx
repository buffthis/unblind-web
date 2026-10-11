import 'highlight.js/styles/github.css';

import ChartBlock, { codeText } from '@components/post/chart/ChartBlock';
import CodeBlock, { getLanguage } from '@components/post/CodeBlock';
import { LAYOUT } from '@styles/constants';
import { copyHeadingLink } from '@utils/headingLink';
import React, { forwardRef } from 'react';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';

const AnchorButton = styled.button`
  margin-left: 8px;
  padding: 0 4px;
  border: none;
  background: none;
  font: inherit;
  color: ${({ theme }) => theme.colors.inkMuted};
  cursor: pointer;
  opacity: 0;

  &:focus-visible {
    opacity: 1;
  }
`;

const Body = styled.div`
  width: 100%;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.ink};
  /* macOS renders subpixel text visibly heavier; grayscale keeps weight 400 looking like 400. */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  word-break: keep-all;
  overflow-wrap: anywhere;

  h2,
  h3 {
    margin-bottom: 4px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.inkStrong};
    scroll-margin-top: ${LAYOUT.HEADER_HEIGHT + 24}px;
  }

  h2 {
    margin-top: 40px;
    font-size: 30px;
    line-height: 1.55;
  }

  h3 {
    margin-top: 24px;
    font-size: 24px;
    line-height: 1.6;
  }

  h2:hover ${AnchorButton}, h3:hover ${AnchorButton} {
    opacity: 1;
  }

  /* Blocks open with 24px and close with 8px; adjacent margins collapse to a 24px gap. */
  p,
  ul,
  ol {
    margin: 24px 0 8px;
  }

  ul,
  ol {
    padding-left: 24px;
  }

  li + li {
    margin-top: 4px;
  }

  blockquote {
    margin: 20px 0;
    padding: 4px 16px;
    border-left: 3px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.inkSub};
  }

  blockquote > :first-child {
    margin-top: 0;
  }

  blockquote > :last-child {
    margin-bottom: 0;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em;
    background: #f6f8fa;
    padding: 2px 4px;
    border-radius: 4px;
  }

  /* highlight.js sets pre code.hljs padding; this selector outranks it regardless of load order. */
  pre code,
  pre code.hljs {
    padding: 0;
    background: none;
    font-size: inherit;
  }

  img {
    max-width: 100%;
    border-radius: 8px;
  }

  a {
    color: ${({ theme }) => theme.colors.accent};
    text-decoration: underline;
  }

  table {
    border-collapse: collapse;
    margin: 20px 0;
    display: block;
    overflow-x: auto;
  }

  th,
  td {
    border: 1px solid ${({ theme }) => theme.colors.border};
    padding: 6px 12px;
  }
`;

function makeHeading(Tag) {
  return function Heading({ node: _node, id, children, ...rest }) {
    return (
      <Tag id={id} {...rest}>
        {children}
        {id && (
          <AnchorButton
            type="button"
            data-heading-anchor=""
            aria-label="이 제목의 링크 복사"
            onClick={() => copyHeadingLink(id)}
          >
            #
          </AnchorButton>
        )}
      </Tag>
    );
  };
}

function LazyImage({ node: _node, alt, ...rest }) {
  return <img loading="lazy" alt={alt || ''} {...rest} />;
}

function PreBlock({ node: _node, children }) {
  if (getLanguage(children) === 'chart') {
    return <ChartBlock source={codeText(children)}>{children}</ChartBlock>;
  }
  return <CodeBlock>{children}</CodeBlock>;
}

// Module-level constants keep plugin and component identities stable across renders.
// rehype-raw is deliberately absent: anyone can publish, so raw HTML must stay inert text.
const REMARK_PLUGINS = [remarkGfm];
// plainText keeps chart blocks as raw text so the parser sees exactly what was written.
const REHYPE_PLUGINS = [
  rehypeSlug,
  [rehypeHighlight, { plainText: ['chart'] }],
];
const COMPONENTS = {
  h2: makeHeading('h2'),
  h3: makeHeading('h3'),
  pre: PreBlock,
  img: LazyImage,
};

const PostArticle = forwardRef(function PostArticle({ content }, ref) {
  return (
    <Body ref={ref}>
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={COMPONENTS}
      >
        {content}
      </Markdown>
    </Body>
  );
});

export default PostArticle;
