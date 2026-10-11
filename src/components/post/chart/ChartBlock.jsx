import CodeBlock from '@components/post/CodeBlock';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import LineChart from './LineChart';
import { formatChartError, parseChart } from './parseChart';

// && beats PostArticle's `p` margin so the note sits right under the code block.
const ErrorNote = styled.p`
  && {
    margin: -12px 0 20px;
    font-size: 0.85rem;
    color: #d93025;
  }
`;

export function codeText(children) {
  const [code] = React.Children.toArray(children);
  const inner = code?.props?.children;
  if (typeof inner === 'string') return inner;
  return React.Children.toArray(inner)
    .filter((child) => typeof child === 'string')
    .join('');
}

class ChartErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Failed to render chart:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// No role="alert" on the note: the editor preview re-renders on every keystroke and a
// live region would announce each intermediate error.
export default function ChartBlock({ source, children }) {
  const result = useMemo(() => parseChart(source), [source]);
  if (!result.ok) {
    return (
      <>
        <CodeBlock>{children}</CodeBlock>
        <ErrorNote>{`차트 문법 오류 · ${formatChartError(result.error)}`}</ErrorNote>
      </>
    );
  }
  return (
    <ChartErrorBoundary
      key={source}
      fallback={<CodeBlock>{children}</CodeBlock>}
    >
      <LineChart chart={result.chart} />
    </ChartErrorBoundary>
  );
}
