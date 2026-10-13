import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

import Alert, { parseAlert } from '@components/post/Alert';
import ChartBlock, { codeText } from '@components/post/chart/ChartBlock';
import CodeBlock, { getLanguage } from '@components/post/CodeBlock';
import { LAYOUT } from '@styles/constants';
import { copyHeadingLink } from '@utils/headingLink';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import styled from 'styled-components';

import useScrollReveal from './useScrollReveal';

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

  /* Same hairline as the chart grid lines. */
  img[data-border] {
    border: 1px solid #ececec;
  }

  /* A captioned image is as wide as the image, so the caption centers under it. */
  span[data-figure] {
    display: block;
    width: fit-content;
    max-width: 100%;
    margin: 24px 0 8px;
  }

  span[data-figure][data-center] {
    margin-left: auto;
    margin-right: auto;
  }

  span[data-figure] img {
    display: block;
  }

  span[data-caption] {
    display: block;
    margin-top: 8px;
    font-size: 14px;
    line-height: 1.5;
    text-align: center;
    color: ${({ theme }) => theme.colors.inkSub};
  }

  /* Images shrink to the column but never grow, so a small one needs this to sit in the middle. */
  img[data-center] {
    display: block;
    margin-left: auto;
    margin-right: auto;
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

  /* Only opacity and transform move, so the entrance stays off the layout path. */
  &[data-reveal] > * {
    opacity: 0;
    transform: translateY(16px);
    transition:
      opacity 400ms ease-out,
      transform 400ms ease-out;
  }

  &[data-reveal] > [data-shown] {
    opacity: 1;
    transform: none;
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

// Markdown has no image options, so flags go after the alt text: "설명 | border | center".
const IMAGE_FLAGS = ['border', 'center'];

function parseImageAlt(alt) {
  const parts = (alt || '').split('|').map((part) => part.trim());
  const flags = new Set();
  while (parts.length > 1 && IMAGE_FLAGS.includes(parts[parts.length - 1])) {
    flags.add(parts.pop());
  }
  return { text: parts.join(' | '), flags };
}

// A quote starting with [!NOTE] and friends becomes an alert; any other quote stays a quote.
function Quote({ node: _node, children }) {
  const alert = parseAlert(children);
  if (!alert) return <blockquote>{children}</blockquote>;
  return <Alert type={alert.type}>{alert.children}</Alert>;
}

// The markdown title ("![alt](url "caption")") becomes a caption centered under the image.
// Spans keep the markup valid, since an image sits inside a paragraph.
function LazyImage({ node: _node, alt, title, ...rest }) {
  const { text, flags } = parseImageAlt(alt);
  const image = (
    <img
      loading="lazy"
      alt={text}
      data-border={flags.has('border') ? '' : undefined}
      data-center={flags.has('center') ? '' : undefined}
      {...rest}
    />
  );
  if (!title) return image;
  return (
    <span data-figure="" data-center={flags.has('center') ? '' : undefined}>
      {image}
      <span data-caption="">{title}</span>
    </span>
  );
}

function PreBlock({ node: _node, children }) {
  if (getLanguage(children) === 'chart') {
    return <ChartBlock source={codeText(children)}>{children}</ChartBlock>;
  }
  return <CodeBlock>{children}</CodeBlock>;
}

// Module-level constants keep plugin and component identities stable across renders.
// rehype-raw is deliberately absent: anyone can publish, so raw HTML must stay inert text.
// A single $ is left alone so prices like "$5 and $10" never turn into math; write inline
// math as $$x^2$$ and display math as a $$ block on its own lines.
const REMARK_PLUGINS = [
  remarkGfm,
  [remarkMath, { singleDollarTextMath: false }],
];
// rehypeKatex runs before rehypeHighlight so highlight.js never sees the language-math code.
// plainText keeps chart blocks as raw text so the parser sees exactly what was written.
const REHYPE_PLUGINS = [
  rehypeSlug,
  rehypeKatex,
  [rehypeHighlight, { plainText: ['chart'] }],
];
const COMPONENTS = {
  h2: makeHeading('h2'),
  h3: makeHeading('h3'),
  pre: PreBlock,
  img: LazyImage,
  blockquote: Quote,
};

// `reveal` fades blocks in on scroll; the editor preview leaves it off so blocks
// do not fade in again while typing.
const PostArticle = forwardRef(function PostArticle(
  { content, reveal = false },
  ref
) {
  const bodyRef = useRef(null);
  useImperativeHandle(ref, () => bodyRef.current);
  const revealing = useScrollReveal(bodyRef, reveal, content);
  return (
    <Body ref={bodyRef} data-reveal={revealing ? '' : undefined}>
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
