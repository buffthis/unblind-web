import BlockErrorNote from '@components/post/BlockErrorNote';
import CodeBlock from '@components/post/CodeBlock';
import { BOX_MARGIN } from '@components/post/spacing';
import Timeline from '@components/timeline/Timeline';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { formatTimelineError, parseTimeline } from './parseTimeline';

const Figure = styled.div`
  margin: ${BOX_MARGIN};
`;

// A ```timeline block drawn as a Timeline. While the source does not parse, the code
// stays on screen with the first error under it, like a chart or tree block. No
// role="alert" on the note: the editor preview re-renders on every keystroke and a live
// region would announce each intermediate error.
export default function TimelineBlock({ source, children }) {
  const parsed = useMemo(() => parseTimeline(source), [source]);
  if (!parsed.ok) {
    return (
      <>
        <CodeBlock>{children}</CodeBlock>
        <BlockErrorNote>{`타임라인 문법 오류 · ${formatTimelineError(parsed.error)}`}</BlockErrorNote>
      </>
    );
  }
  const { title, hide, gapMin, groups } = parsed.timeline;
  return (
    <Figure data-timeline="">
      <Timeline
        title={title ?? undefined}
        groups={groups}
        showDay={!hide.day}
        showTime={!hide.time}
        showGap={!hide.gap}
        gapMin={gapMin}
      />
    </Figure>
  );
}
