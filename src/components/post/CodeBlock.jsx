import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const LANGUAGE_CLASS = /language-([\w-]+)/;
const COPIED_RESET_MS = 1500;

const Wrapper = styled.div`
  position: relative;
  margin: 20px 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: #f6f8fa;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

const CopyButton = styled.button`
  margin-left: auto;
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: #fff;
  font: inherit;
  cursor: pointer;
`;

const Pre = styled.pre`
  margin: 0;
  padding: 16px;
  overflow-x: auto;
`;

export function getLanguage(children) {
  const [code] = React.Children.toArray(children);
  const className = code?.props?.className || '';
  return className.match(LANGUAGE_CLASS)?.[1] ?? null;
}

export default function CodeBlock({ children }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const language = getLanguage(children);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  // navigator.clipboard is missing outside secure contexts, so the access itself sits inside try.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preRef.current?.textContent ?? '');
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <Wrapper>
      <Toolbar>
        {language && <span>{language}</span>}
        <CopyButton type="button" onClick={handleCopy}>
          {copied ? '복사됨' : '복사'}
        </CopyButton>
      </Toolbar>
      <Pre ref={preRef}>{children}</Pre>
    </Wrapper>
  );
}
