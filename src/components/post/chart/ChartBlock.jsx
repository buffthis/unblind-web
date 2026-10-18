import BlockErrorNote from '@components/post/BlockErrorNote';
import CodeBlock from '@components/post/CodeBlock';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import styled from 'styled-components';

import BarChart from './BarChart';
import { Figure } from './chartParts';
import LineChart from './LineChart';
import { buildRemoteChart, formatChartError, parseChart } from './parseChart';
import { ChartReplayContext } from './replay';
import useChartData from './useChartData';

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

// A chart whose rows are in a file keeps its place at about the height of a drawn chart,
// so the post does not jump when the file arrives.
const Placeholder = styled(Figure)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 340px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.inkMuted};
`;

// No role="alert" on the note: the editor preview re-renders on every keystroke and a
// live region would announce each intermediate error. `drawn` remembers a finished
// draw-in, so a chart remounted after a syntax error appears in full instead of
// playing the draw-in again. It is state rather than a ref because it is read during
// render; the charts only read it on mount, so the extra render changes nothing.
export default function ChartBlock({ source, children }) {
  const parsed = useMemo(() => parseChart(source), [source]);
  const remote = parsed.ok ? parsed.remote : undefined;
  const { status, data: file, error: fetchError } = useChartData(remote?.url);
  // Keyed on the file itself, not on the object the hook returns: a chart of tens of
  // thousands of rows should be checked once, not on every render.
  const result = useMemo(() => {
    if (!remote) return parsed;
    return status === 'ready' ? buildRemoteChart(remote, file) : null;
  }, [parsed, remote, status, file]);
  const [drawn, setDrawn] = useState(false);
  const markDrawn = useCallback(() => setDrawn(true), []);
  const replay = useContext(ChartReplayContext);
  if (remote && status === 'error') {
    return (
      <>
        <CodeBlock>{children}</CodeBlock>
        <BlockErrorNote>{`차트 데이터를 불러오지 못했습니다 · ${fetchError}`}</BlockErrorNote>
      </>
    );
  }
  if (!result) {
    return <Placeholder role="status">차트 데이터를 불러오는 중</Placeholder>;
  }
  if (!result.ok) {
    return (
      <>
        <CodeBlock>{children}</CodeBlock>
        <BlockErrorNote>{`차트 문법 오류 · ${formatChartError(result.error)}`}</BlockErrorNote>
      </>
    );
  }
  const Chart = result.chart.type === 'line' ? LineChart : BarChart;
  return (
    <ChartErrorBoundary
      source={source}
      fallback={<CodeBlock>{children}</CodeBlock>}
    >
      <Chart
        chart={result.chart}
        skipDrawIn={drawn}
        onDrawn={markDrawn}
        replay={replay}
      />
    </ChartErrorBoundary>
  );
}
