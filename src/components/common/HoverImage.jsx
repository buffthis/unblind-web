import { toSafeHttpUrl } from '@utils/url';
import React, { useState } from 'react';
import styled from 'styled-components';

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  &:hover img,
  &:focus-within img {
    transform: scale(1.08);
  }
`;

const BaseImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    opacity 0.4s,
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: ${({ $isActive }) => ($isActive ? 1 : 0)};
  transition: opacity 0.4s;
  background: radial-gradient(
    circle,
    rgba(0, 0, 0, 0.18) 0%,
    rgba(0, 0, 0, 0.28) 55%,
    rgba(0, 0, 0, 0.55) 100%
  );
  z-index: 1;
`;

const ActionButton = styled.button`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  padding: 8px 20px;
  font-size: 0.9rem;
  font-weight: 200;
  font-family: inherit;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #222;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  pointer-events: none;
  transition:
    opacity 0.4s,
    transform 0.4s,
    box-shadow 0.2s;
  z-index: 3;
  ${({ $isActive }) =>
    $isActive &&
    `
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.04);
      pointer-events: auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
    `}

  &:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }
`;

const HoverImage = ({
  baseImage,
  alt,
  link,
  buttonText = 'More',
  onButtonClick,
  showOverlay = false,
  showButton = true,
}) => {
  const [isActive, setIsActive] = useState(false);
  const safeLink = toSafeHttpUrl(link);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (onButtonClick) {
      onButtonClick();
    } else if (safeLink) {
      window.open(safeLink, '_blank', 'noopener,noreferrer');
    }
  };

  const image = <BaseImage src={baseImage} alt={alt} />;

  return (
    <ImageContainer
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
    >
      {safeLink ? (
        <a href={safeLink} target="_blank" rel="noopener noreferrer">
          {image}
        </a>
      ) : (
        image
      )}
      {showOverlay && <Overlay $isActive={isActive} />}
      {showButton && (
        <ActionButton
          $isActive={isActive}
          onClick={handleButtonClick}
          aria-label={buttonText}
        >
          {buttonText}
        </ActionButton>
      )}
    </ImageContainer>
  );
};

export default HoverImage;
