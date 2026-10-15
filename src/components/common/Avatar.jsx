import FadeInImage from '@components/common/FadeInImage';
import { toAvatarUrl, toDirectImageUrl } from '@utils/imageUrl';
import React from 'react';
import { FiUser } from 'react-icons/fi';
import styled from 'styled-components';

const DefaultAvatar = styled.span`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  border: ${({ $borderWidth }) => $borderWidth}px solid
    ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a8a8a;
  background: #f5f5f5;
  box-sizing: border-box;
`;

// 테두리를 프레임에 두면 절대 배치된 이미지가 padding box 기준으로 놓여 테두리 안쪽에
// 들어간다. 테두리를 이미지에 걸었던 기존 동작(border-box)과 최종 크기가 같다.
const Circle = styled(FadeInImage)`
  border-radius: 50%;
  border: ${({ $borderWidth }) => $borderWidth}px solid
    ${({ theme }) => theme.colors.border};
  box-sizing: border-box;
  overflow: hidden;
`;

// 프로필 이미지가 없거나 로드에 실패했을 때 깨진 이미지 대신 기본 아이콘을 보여준다.
export default function Avatar({
  src,
  alt = '',
  size = 30,
  borderWidth = 1.5,
  style,
  loading,
  fetchPriority,
}) {
  const fallbackIcon = (
    <DefaultAvatar
      $size={size}
      $borderWidth={borderWidth}
      style={style}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <FiUser size={Math.round(size * 0.53)} />
    </DefaultAvatar>
  );

  if (!src) return fallbackIcon;

  return (
    <Circle
      $borderWidth={borderWidth}
      src={toAvatarUrl(src, size)}
      fallbackSrc={toDirectImageUrl(src)}
      alt={alt}
      width={size}
      height={size}
      fit="cover"
      skeletonRadius="50%"
      loading={loading}
      fetchPriority={fetchPriority}
      renderError={fallbackIcon}
      style={style}
    />
  );
}
