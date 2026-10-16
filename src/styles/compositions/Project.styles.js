import styled from 'styled-components';

export const ProjectList = styled.div`
  margin-top: 50px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 50px;
  width: 100%;
  max-width: 1024px;
  margin-left: auto;
  margin-right: auto;
  perspective: 1000px;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    max-width: 350px;
  }
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 30px;
    margin-top: 30px;
    max-width: 95vw;
  }
`;

export const ProjectCard = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: 0;
  width: ${({ $width }) => $width || '350px'};
  will-change: transform;
  backface-visibility: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: ${({ $width }) => ($width ? `calc(${$width} * 0.8)` : '300px')};
  }
`;

// The corners of a project card thumbnail round off over this many pixels from its edge.
const PROJECT_IMAGE_RADIUS = 16;

export const ProjectImageContainer = styled.div`
  width: 100%;
  aspect-ratio: ${({ $ratio }) => $ratio || '4 / 3'};
  overflow: hidden;
  position: relative;
  box-shadow: ${({ $shadow }) => $shadow || '0 4px 20px rgba(0, 0, 0, 0.1)'};
  border-radius: ${({ $radius }) => $radius || `${PROJECT_IMAGE_RADIUS}px`};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-sizing: border-box;
`;

export const ProjectContent = styled.div`
  padding: ${({ $inset }) => ($inset ? `0 ${$inset}` : 0)};
  text-align: left;
`;

export const ProjectTitle = styled.h3`
  font-size: ${({ $fontSize }) => $fontSize || '1.6rem'};
  font-weight: ${({ $fontWeight }) => $fontWeight || '700'};
  color: ${({ theme }) => theme.colors.primary};
  margin-top: ${({ $marginTop }) => $marginTop || '12px'};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: ${({ $fontSize }) =>
      $fontSize ? `calc(${$fontSize} * 0.8)` : '1.3rem'};
    margin-top: 15px;
  }
`;

export const ProjectDescription = styled.p`
  font-size: ${({ $fontSize }) => $fontSize || '1.0rem'};
  font-weight: ${({ $fontWeight }) => $fontWeight || '200'};
  color: ${({ theme }) => theme.colors.secondary};
  margin-top: ${({ $marginTop }) => $marginTop || '4px'};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: ${({ $fontSize }) =>
      $fontSize ? `calc(${$fontSize} * 0.8)` : '0.95rem'};
    margin: 2px 0;
  }
`;

export const Period = styled.span`
  font-size: ${({ $fontSize }) => $fontSize || '1.0rem'};
  font-weight: ${({ $fontWeight }) => $fontWeight || '200'};
  letter-spacing: ${({ $letterSpacing }) => $letterSpacing || 'normal'};
  color: ${({ theme }) => theme.colors.secondary};
  display: block;
  margin-top: ${({ $marginTop }) => $marginTop || '6px'};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 0.6rem;
    line-height: 2.4;
  }
`;
