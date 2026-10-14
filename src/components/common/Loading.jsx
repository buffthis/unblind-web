import Logo from '@components/common/Logo';
import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

import { loadingRun } from './loadingRun';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${({ $height }) => $height || '100vh'};
  margin-top: ${({ $marginTop }) => $marginTop || '0px'};
`;

const appear = keyframes`
  from {
    opacity: 0;
  }
`;

// The delay keeps the logo hidden until the run has lasted SHOW_AFTER. A loader
// that takes over a logo already up skips the fade so the logo does not blink.
const Mark = styled.div`
  animation: ${appear} 150ms ease-out backwards;
`;

const Loading = ({ height, marginTop }) => {
  const [delay] = useState(() => loadingRun.start(performance.now()));
  useEffect(() => {
    loadingRun.attach();
    return () => loadingRun.detach(performance.now());
  }, []);

  return (
    <LoadingContainer
      $height={height}
      $marginTop={marginTop}
      role="status"
      aria-label="로딩 중"
    >
      <Mark
        style={
          delay > 0 ? { animationDelay: `${delay}ms` } : { animation: 'none' }
        }
      >
        <Logo variant="black" size={120} />
      </Mark>
    </LoadingContainer>
  );
};

export default Loading;
