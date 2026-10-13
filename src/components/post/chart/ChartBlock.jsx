import BlockErrorNote from '@components/post/BlockErrorNote';
import CodeBlock from '@components/post/CodeBlock';
import React, { useCallback, useMemo, useState } from 'react';

import LineChart from './LineChart';
import { formatChartError, parseChart } from './parseChart';

export function codeText(children) {
  const [code] = React.Children.toArray(children);
  const inner = code?.props?.children;
  if (typeof inner === 'string') return inner;
  return React.Children.toArray(inner)
    .filter((child) => typeof child === 'string')
    .join('');
}

// The boundary stays mounted across edits (no key) so the chart inside keeps its
// state; a failed render is retried once the source changes.
class ChartErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prevProps) {
    if (this.state.failed && prevProps.source !== this.props.source) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error) {
    console.error('Failed to render chart:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// No role="alert" on the note: the editor preview re-renders on every keystroke and a
// live region would announce each intermediate error. `drawn` remembers a finished
// draw-in, so a chart remounted after a syntax error appears in full instead of
// playing the draw-in again. It is state rather than a ref because it is read during
// render; LineChart only reads it on mount, so the extra render changes nothing.
export default function ChartBlock({ source, children }) {
  const result = useMemo(() => parseChart(source), [source]);
  const [drawn, setDrawn] = useState(false);
  const markDrawn = useCallback(() => setDrawn(true), []);
  if (!result.ok) {
    return (
      <>
        <CodeBlock>{children}</CodeBlock>
        <BlockErrorNote>{`차트 문법 오류 · ${formatChartError(result.error)}`}</BlockErrorNote>
      </>
    );
  }
  return (
    <ChartErrorBoundary
      source={source}
      fallback={<CodeBlock>{children}</CodeBlock>}
    >
      <LineChart chart={result.chart} skipDrawIn={drawn} onDrawn={markDrawn} />
    </ChartErrorBoundary>
  );
}
