import 'highlight.js/styles/github.css';

import CodeBlock from '@components/post/CodeBlock';
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
  color: ${({ theme }) => theme.colors.secondary};
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
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text};
  word-break: keep-all;
  overflow-wrap: anywhere;

  h2,
  h3 {
    margin: 48px 0 16px;
    line-height: 1.35;
    font-weight: 700;
    scroll-margin-top: ${LAYOUT.HEADER_HEIGHT + 24}px;
  }

  h2 {
    font-size: 1.5rem;
  }

  h3 {
    font-size: 1.25rem;
  }

  h2:hover ${AnchorButton}, h3:hover ${AnchorButton} {
    opacity: 1;
  }

  p {
    margin: 16px 0;
  }

  ul,
  ol {
    margin: 16px 0;
    padding-left: 24px;
  }

  li + li {
    margin-top: 4px;
  }

  blockquote {
    margin: 20px 0;
    padding: 4px 16px;
    border-left: 3px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.secondary};
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em;
    background: #f6f8fa;
    padding: 2px 4px;
    border-radius: 4px;
  }

  pre code {
    padding: 0;
    background: none;
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

// Module-level constants keep plugin and component identities stable across renders.
// rehype-raw is deliberately absent: anyone can publish, so raw HTML must stay inert text.
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeSlug, rehypeHighlight];
const COMPONENTS = {
  h2: makeHeading('h2'),
  h3: makeHeading('h3'),
  pre: CodeBlock,
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
