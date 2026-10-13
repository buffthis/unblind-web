import BlockErrorNote from '@components/post/BlockErrorNote';
import CodeBlock from '@components/post/CodeBlock';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { formatTreeError, parseTree } from './parseTree';

// Each label row is 36px tall (28px line plus 4px above and below), so a connector
// drawn 17px from a row's top runs through the middle of its 2px stroke.
const ROW_MIDDLE = 17;
const STROKE = 2;
// The gap after a parent label, the run to the vertical bar, and the run from the
// bar to a child label. The child label starts LEAD_OUT + GAP after the bar.
const GAP = 10;
const LEAD_IN = 15;
const LEAD_OUT = 9;

// Labels of depth d appear at step 2d and the lines down to depth d at step 2d - 1,
// so the tree grows one level at a time: root, lines, children, lines, and so on.
const STEP_MS = 180;
const FADE_MS = 240;
const LINE_MS = 300;

const lineDelay = `calc((var(--depth) * 2 - 1) * ${STEP_MS}ms)`;
const labelDelay = `calc(var(--depth) * 2 * ${STEP_MS}ms)`;

const Figure = styled.div`
  margin: 24px 0 8px;
  padding: 4px 0;
  overflow-x: auto;

  /* && outranks PostArticle's list margins and padding. */
  && ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    position: relative;
    display: flex;
    align-items: flex-start;
  }

  && li + li {
    margin-top: 0;
  }

  [data-label] {
    display: block;
    padding: 4px 0;
    font-size: 16px;
    line-height: 28px;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.ink};
  }

  && li > ul {
    position: relative;
    display: flex;
    flex-direction: column;
    margin-left: ${GAP}px;
    padding-left: ${LEAD_IN + LEAD_OUT + GAP}px;
  }

  li > ul::before,
  li > ul > li::before,
  li > ul > li::after {
    content: '';
    position: absolute;
    border-radius: 1px;
    background: ${({ theme }) => theme.colors.accent};
  }

  /* From the parent label to the bar. */
  li > ul::before {
    left: 0;
    top: ${ROW_MIDDLE}px;
    width: ${LEAD_IN + STROKE}px;
    height: ${STROKE}px;
    transform-origin: left;
  }

  /* From the bar to each child label. */
  li > ul > li::before {
    left: -${LEAD_OUT + GAP}px;
    top: ${ROW_MIDDLE}px;
    width: ${LEAD_OUT}px;
    height: ${STROKE}px;
    transform-origin: left;
  }

  /* The bar, one segment per child, from the first child's row to the last's. */
  li > ul > li::after {
    left: -${LEAD_OUT + GAP}px;
    top: 0;
    bottom: 0;
    width: ${STROKE}px;
    transform-origin: top;
  }

  li > ul > li:first-child::after {
    top: ${ROW_MIDDLE}px;
  }

  li > ul > li:last-child::after {
    bottom: auto;
    height: ${ROW_MIDDLE + STROKE}px;
  }

  li > ul > li:only-child::after {
    display: none;
  }

  /* With scroll reveal on, the tree grows each time its block is shown. Without it
     (editor preview, reduced motion) the tree is simply drawn. */
  [data-reveal] & [data-label] {
    opacity: 0;
    transition: opacity ${FADE_MS}ms ease-out;
  }

  /* The lines into a level are uncovered by clipping their list from the top-left
     corner, so the bar grows down in one stroke and each stub branches off as the
     bar reaches it. Scaling each segment would grow them separately and leave the
     bar looking dashed. Anything deeper in the list appears later, so clipping it
     here hides nothing that should be visible yet. */
  [data-reveal] && li > ul {
    clip-path: inset(0 100% 100% 0);
    transition: clip-path ${LINE_MS}ms ease-out;
  }

  [data-reveal] > &[data-shown] [data-label],
  [data-reveal] > [data-shown] & [data-label] {
    opacity: 1;
    transition-delay: ${labelDelay};
  }

  [data-reveal] > &&[data-shown] li > ul,
  [data-reveal] > [data-shown] && li > ul {
    clip-path: inset(0);
    transition-delay: ${lineDelay};
  }
`;

function TreeNode({ node, depth }) {
  return (
    <li style={{ '--depth': depth }}>
      <span data-label="">{node.label}</span>
      {node.children.length > 0 && (
        <ul style={{ '--depth': depth + 1 }}>
          {node.children.map((child, index) => (
            <TreeNode key={index} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

// Nested lists keep the hierarchy readable to screen readers; the lines are drawn
// with pseudo-elements, so they are never read out.
export default function TreeBlock({ source, children }) {
  const result = useMemo(() => parseTree(source), [source]);
  if (!result.ok) {
    return (
      <>
        <CodeBlock>{children}</CodeBlock>
        <BlockErrorNote>{`트리 문법 오류 · ${formatTreeError(result.error)}`}</BlockErrorNote>
      </>
    );
  }
  return (
    <Figure data-tree="">
      <ul>
        <TreeNode node={result.tree} depth={0} />
      </ul>
    </Figure>
  );
}
