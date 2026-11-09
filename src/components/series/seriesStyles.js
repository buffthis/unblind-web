import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const SeriesPageLayout = styled.main`
  width: 100%;
  max-width: 598px;
  margin: 0 auto;
  padding: 64px 24px 112px;
  color: ${({ theme }) => theme.colors.ink};
  -webkit-font-smoothing: antialiased;
  overflow-wrap: anywhere;
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding-top: 36px;
  }
  a:focus-visible,
  button:focus-visible,
  summary:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 4px;
  }
`;

export const Eyebrow = styled.p`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.6px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

export const SeriesTitle = styled.h1`
  margin: 16px 0;
  font-size: clamp(28px, 5vw, 36px);
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: -1px;
  word-break: keep-all;
`;

export const Description = styled.p`
  color: ${({ theme }) => theme.colors.inkSub};
  font-size: 15px;
  line-height: 1.85;
  white-space: pre-line;
`;

export const Muted = styled.p`
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 13px;
  line-height: 1.7;
  margin: 12px 0;
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ $primary, theme }) =>
    $primary ? theme.colors.inkStrong : theme.colors.background};
  color: ${({ $primary, theme }) =>
    $primary ? theme.colors.background : theme.colors.ink};
  font: inherit;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
  &:hover:not(:disabled) {
    opacity: 0.75;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export const TextLink = styled(Link)`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
  &:hover {
    color: ${({ theme }) => theme.colors.inkStrong};
  }
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
`;

export const SeriesForm = styled.form`
  label {
    display: block;
    margin: 24px 0 8px;
    font-size: 13px;
  }
  input,
  textarea,
  select {
    width: 100%;
    padding: 12px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 6px;
    background: ${({ theme }) => theme.colors.background};
    color: inherit;
    font: inherit;
    font-size: 14px;
  }
  textarea {
    min-height: 110px;
    resize: vertical;
  }
  h2 {
    margin-top: 40px;
    font-size: 16px;
    font-weight: 600;
  }
  fieldset {
    border: none;
    min-width: 0;
  }
`;
