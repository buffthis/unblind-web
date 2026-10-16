import Alert, { parseAlert } from '@components/post/Alert';
import ChartBlock, { codeText } from '@components/post/chart/ChartBlock';
import { ChartReplayContext } from '@components/post/chart/replay';
import CodeBlock, { getLanguage } from '@components/post/CodeBlock';
import GitHubLink from '@components/post/GitHubLink';
import MermaidBlock from '@components/post/mermaid/MermaidBlock';
import TreeBlock from '@components/post/tree/TreeBlock';
import { LAYOUT } from '@styles/constants';
import { copyHeadingLink } from '@utils/headingLink';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import Markdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import styled from 'styled-components';

import { ENTRANCE_DURATION } from './entrance';
import { useRehypePlugins } from './markdownPlugins';
import remarkBlankLines from './remarkBlankLines';
import remarkBreaks from './remarkBreaks';
import remarkHighlight from './remarkHighlight';
import remarkHtmlAsText from './remarkHtmlAsText';
import useScrollReveal from './useScrollReveal';

// Sits in the left gutter so the rule after an h2 starts right at the text.
const AnchorButton = styled.button`
  position: absolute;
  top: 0;
  right: 100%;
  padding: 0 6px;
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
  font-size: 15px;
  font-weight: 460;
  line-height: 24px;
  letter-spacing: -0.1px;
  color: ${({ theme }) => theme.colors.ink};
  /* macOS renders subpixel text visibly heavier; grayscale keeps weight 400 looking like 400. */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  word-break: keep-all;
  overflow-wrap: anywhere;

  h2,
  h3 {
    position: relative;
    margin-bottom: 40px;
    font-weight: 560;
    color: ${({ theme }) => theme.colors.inkStrong};
    scroll-margin-top: ${LAYOUT.HEADER_HEIGHT + 24}px;
  }

  h3 {
    font-size: 15px;
    line-height: 24px;
  }

  h2 {
    display: flex;
    align-items: flex-start;
    margin-top: 128px;
    font-size: 22px;
    line-height: 30px;
  }

  /* A hairline runs from the title to the column edge, centered on its first line. */
  h2::after {
    content: '';
    flex: 1 0 24px;
    height: 1px;
    margin: 15px 0 0 8px;
    background: ${({ theme }) => theme.colors.inkSurface};
  }

  /* The page already spaces the article from the header above it. */
  & > h2:first-child {
    margin-top: 0;
  }

  h3 {
    margin-top: 44px;
    margin-bottom: 24px;
  }

  h2:hover ${AnchorButton}, h3:hover ${AnchorButton} {
    opacity: 1;
  }

  /* Blank lines beyond the first (see remarkBlankLines) add 20px each. Padding is used
     because it adds to a block's own margin, where a margin would collapse into it. */
  [data-gap='1'] {
    padding-top: 20px;
  }

  [data-gap='2'] {
    padding-top: 40px;
  }

  [data-gap='3'] {
    padding-top: 60px;
  }

  /* Blocks open with 20px and close with 0; adjacent margins collapse to a 20px gap. */
  p,
  ul,
  ol {
    margin: 20px 0 0;
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

  /* A highlighter stroke over the lower part of the line, repeated on each wrapped line. */
  mark {
    padding: 0 2px;
    background: linear-gradient(transparent 50%, #fff3a3 50%);
    color: inherit;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em;
    background: #f6f8fa;
    padding: 2px 4px;
    border-radius: 4px;
  }

  /* highlight.js sets pre code.hljs padding and its own horizontal scroll; this selector
     outranks it regardless of load order. The pre scrolls instead (see CodeBlock), so
     the scrollbar sits at the bottom edge of the box, under the padding. */
  pre code,
  pre code.hljs {
    padding: 0;
    background: none;
    font-size: inherit;
    overflow: visible;
  }

  img {
    max-width: 100%;
    border-radius: ${({ theme }) => theme.radius.md};
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

  /* A link reads as part of the text, marked by a light underline that darkens
     on hover. text-decoration, unlike a drawn line, follows a link across lines. */
  a {
    color: inherit;
    text-decoration: underline 1px;
    /* Slightly darker than the border token, which all but vanishes under text. */
    text-decoration-color: #d9d9d9;
    text-underline-offset: 4px;
    transition: text-decoration-color 0.2s;
  }

  a:hover {
    text-decoration-color: ${({ theme }) => theme.colors.inkSoft};
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

  /* Footnotes: a small grey number in the text, and the notes in small grey type
     under a short rule at the end. Raw HTML stays text, so every sup is a reference. */
  sup {
    display: inline-block;
    height: 0.6em;
    padding-left: 0.35em;
    font-size: 0.6em;
    line-height: 1;
    vertical-align: super;
  }

  a[data-footnote-ref] {
    position: relative;
    color: ${({ theme }) => theme.colors.inkMuted};
    text-decoration: none;
    transition: color 0.2s;
    scroll-margin-top: ${LAYOUT.HEADER_HEIGHT + 24}px;
  }

  /* The number is only a few pixels wide; an invisible pad makes it easier to hit. */
  a[data-footnote-ref]::after {
    content: '';
    position: absolute;
    inset: -1px -2px;
  }

  a[data-footnote-ref]:hover {
    color: ${({ theme }) => theme.colors.ink};
  }

  section[data-footnotes] {
    margin-top: 40px;
  }

  section[data-footnotes]::before {
    content: '';
    display: block;
    width: 50px;
    height: 1px;
    background: ${({ theme }) => theme.colors.border};
  }

  /* The label is for screen readers only. */
  section[data-footnotes] > h2 {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  section[data-footnotes] ol {
    margin: 0;
    padding: 48px 0 0 4px;
    list-style: none;
    counter-reset: footnote;
  }

  section[data-footnotes] li {
    position: relative;
    margin: 0;
    padding: 0 0 9px 4px;
    counter-increment: footnote;
    font-size: 13px;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.inkMuted};
    scroll-margin-top: ${LAYOUT.HEADER_HEIGHT + 24}px;
  }

  section[data-footnotes] li::before {
    content: counter(footnote);
    position: absolute;
    top: 0;
    right: 100%;
    font-size: 8px;
    line-height: 1;
  }

  section[data-footnotes] li p {
    margin: 0;
  }

  /* The back link covers the whole note, so clicking anywhere on it returns to
     the reference; links inside the note sit above it. */
  a[data-footnote-backref] {
    position: absolute;
    inset: 0 0 9px;
    z-index: 1;
    overflow: hidden;
    text-indent: -9999px;
  }

  section[data-footnotes] li a:not([data-footnote-backref]) {
    position: relative;
    z-index: 2;
    color: ${({ theme }) => theme.colors.inkSoft};
  }

  section[data-footnotes] li a:not([data-footnote-backref]):hover {
    color: ${({ theme }) => theme.colors.ink};
  }

  /* Only opacity and transform move, so the entrance stays off the layout path. */
  &[data-reveal] > * {
    opacity: 0;
    transform: translateY(16px);
    transition:
      opacity ${ENTRANCE_DURATION}ms ease-out,
      transform ${ENTRANCE_DURATION}ms ease-out;
    transition-delay: var(--reveal-delay, 0ms);
  }

  &[data-reveal] > [data-shown] {
    opacity: 1;
    transform: none;
  }
`;

// The id remark-rehype gives the hidden heading of the footnotes.
const FOOTNOTE_LABEL_ID = 'footnote-label';

function makeHeading(Tag) {
  return function Heading({ node: _node, id, children, ...rest }) {
    if (id === FOOTNOTE_LABEL_ID) {
      return (
        <Tag id={id} {...rest}>
          {children}
        </Tag>
      );
    }
    return (
      <Tag id={id} {...rest}>
        {/* One wrapper keeps inline code or emphasis in the same line box when the h2 is a flex row. */}
        <span>{children}</span>
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

// Markdown has no image options, so flags go after the alt text: "설명 | border | center | 50%".
const IMAGE_FLAGS = ['border', 'center'];

// A width is a whole percent of the column (1 to 100) or a whole number of pixels. The
// pattern is also what makes the value safe to put in a style attribute.
function widthOf(part) {
  const match = /^(\d{1,4})(%|px)$/.exec(part);
  if (!match) return null;
  const amount = Number(match[1]);
  if (amount < 1 || (match[2] === '%' && amount > 100)) return null;
  return part;
}

function parseImageAlt(alt) {
  const parts = (alt || '').split('|').map((part) => part.trim());
  const flags = new Set();
  let width = null;
  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (IMAGE_FLAGS.includes(last)) {
      flags.add(last);
    } else if (width === null && widthOf(last)) {
      width = last;
    } else {
      break;
    }
    parts.pop();
  }
  return { text: parts.join(' | '), flags, width };
}

// A quote starting with [!NOTE] and friends becomes an alert; any other quote stays a quote.
function Quote({ node: _node, children, ...rest }) {
  const alert = parseAlert(children);
  const block = alert ? (
    <Alert type={alert.type}>{alert.children}</Alert>
  ) : (
    <blockquote>{children}</blockquote>
  );
  return withGap(rest, block);
}

// The markdown title ("![alt](url "caption")") becomes a caption centered under the image.
// Spans keep the markup valid, since an image sits inside a paragraph.
function LazyImage({ node: _node, alt, title, ...rest }) {
  const { text, flags, width } = parseImageAlt(alt);
  const image = (
    <img
      loading="lazy"
      alt={text}
      data-border={flags.has('border') ? '' : undefined}
      data-center={flags.has('center') ? '' : undefined}
      // With a caption the figure takes the width and the image fills it.
      style={width ? { width: title ? '100%' : width } : undefined}
      {...rest}
    />
  );
  if (!title) return image;
  return (
    <span
      data-figure=""
      data-center={flags.has('center') ? '' : undefined}
      style={width ? { width } : undefined}
    >
      {image}
      <span data-caption="">{title}</span>
    </span>
  );
}

// The words after the language on the opening fence, so "```mermaid border" gives
// the set {"border"}. They are flags in the same spirit as an image alt's |border.
function fenceFlags(node) {
  const meta = node?.children?.[0]?.data?.meta;
  return new Set(
    typeof meta === 'string' ? meta.split(/\s+/).filter(Boolean) : []
  );
}

// A block that draws its own border or background carries the extra blank-line gap on a
// wrapper, because padding on the block itself would stretch the border upward.
function withGap(props, block) {
  const gap = props['data-gap'];
  return gap ? <div data-gap={gap}>{block}</div> : block;
}

// remark-rehype puts a code block's hProperties on the inner <code>, so the gap is read
// there and taken off it, leaving the wrapper as the only element that carries it.
function PreBlock({ node, children }) {
  const [code, ...others] = React.Children.toArray(children);
  const gap = React.isValidElement(code) ? code.props['data-gap'] : undefined;
  const plain = gap
    ? [React.cloneElement(code, { 'data-gap': undefined }), ...others]
    : children;
  return withGap(
    { 'data-gap': gap },
    <PreContent node={node}>{plain}</PreContent>
  );
}

function PreContent({ node, children }) {
  const language = getLanguage(children);
  if (language === 'chart') {
    return <ChartBlock source={codeText(children)}>{children}</ChartBlock>;
  }
  if (language === 'tree') {
    return <TreeBlock source={codeText(children)}>{children}</TreeBlock>;
  }
  if (language === 'mermaid') {
    return (
      <MermaidBlock
        source={codeText(children)}
        bordered={fenceFlags(node).has('border')}
      >
        {children}
      </MermaidBlock>
    );
  }
  return <CodeBlock>{children}</CodeBlock>;
}

// Module-level constants keep plugin and component identities stable across renders.
// rehype-raw is deliberately absent: anyone can publish, so raw HTML must stay inert text.
// A single $ is left alone so prices like "$5 and $10" never turn into math; write inline
// math as $$x^2$$ and display math as a $$ block on its own lines.
const REMARK_PLUGINS = [
  // First, while every block still carries the line numbers the parser gave it.
  remarkBlankLines,
  remarkGfm,
  [remarkMath, { singleDollarTextMath: false }],
  remarkHighlight,
  // Before remarkBreaks, so a multi-line HTML block keeps its line breaks.
  remarkHtmlAsText,
  remarkBreaks,
];
// Math and code highlighting are added by useRehypePlugins once a post needs them.
// Its plainText keeps chart, tree and mermaid blocks as raw text so the parser sees exactly what was written.
const REHYPE_PLUGINS = [rehypeSlug];
// Footnotes are written [^1] in the text and "[^1]: note" anywhere in the post.
const REMARK_REHYPE_OPTIONS = {
  footnoteLabel: '각주',
  footnoteBackLabel: (referenceIndex, rereferenceIndex) =>
    `${referenceIndex + 1}번 각주를 단 곳${
      rereferenceIndex > 1 ? `(${rereferenceIndex}번째)` : ''
    }으로 돌아가기`,
};
const COMPONENTS = {
  h2: makeHeading('h2'),
  h3: makeHeading('h3'),
  pre: PreBlock,
  img: LazyImage,
  blockquote: Quote,
  a: GitHubLink,
};

// `reveal` fades blocks in on scroll; the editor preview leaves it off so blocks
// do not fade in again while typing. `entrance` staggers the first screen of blocks.
// `replayCharts` redraws a chart each time it scrolls back into view.
const PostArticle = forwardRef(function PostArticle(
  { content, reveal = false, entrance, replayCharts = false },
  ref
) {
  const bodyRef = useRef(null);
  useImperativeHandle(ref, () => bodyRef.current);
  const revealing = useScrollReveal(bodyRef, reveal, content, entrance);
  const rehypePlugins = useRehypePlugins(content, REHYPE_PLUGINS);
  return (
    <ChartReplayContext.Provider value={replayCharts}>
      <Body ref={bodyRef} data-reveal={revealing ? '' : undefined}>
        <Markdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={rehypePlugins}
          remarkRehypeOptions={REMARK_REHYPE_OPTIONS}
          components={COMPONENTS}
        >
          {content}
        </Markdown>
      </Body>
    </ChartReplayContext.Provider>
  );
});

export default PostArticle;
