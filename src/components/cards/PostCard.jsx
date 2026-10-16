import HoverImage from '@components/common/HoverImage';
import useHoverPrefetch, { usePrefetchPost } from '@hooks/usePrefetch';
import {
  Period,
  PROJECT_IMAGE_RADIUS,
  ProjectCard,
  ProjectContent,
  ProjectDescription,
  ProjectImageContainer,
  ProjectTitle,
} from '@styles/compositions/Project.styles';
import { formatDate } from '@utils/format';
import { splitThumbnail } from '@utils/thumbnail';
import React from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';

const cardLinkStyle = css`
  display: block;
  color: inherit;
  text-decoration: none;
`;

const CardLink = styled(Link)`
  ${cardLinkStyle}
`;

export default function PostCard({ post }) {
  const thumbnail = splitThumbnail(post.thumbnail?.url);
  const prefetchHandlers = useHoverPrefetch(usePrefetchPost(post.id));

  const body = (
    <>
      <ProjectImageContainer $ratio="16 / 9" $shadow="none">
        <HoverImage
          baseImage={thumbnail.src}
          alt={post.title}
          showButton={false}
          bordered={thumbnail.border}
        />
      </ProjectImageContainer>
      {/* The text starts where the corner of the thumbnail stops curving. */}
      <ProjectContent $inset={PROJECT_IMAGE_RADIUS}>
        <ProjectTitle $fontSize="0.9rem" $marginTop="8.5px">
          {post.title}
        </ProjectTitle>
        <ProjectDescription $fontSize="0.8rem" $marginTop="0.75px">
          {post.subtitle}
        </ProjectDescription>
        <Period
          $fontSize="0.7rem"
          $fontWeight="100"
          $letterSpacing="0.08em"
          $marginTop="3px"
        >
          {formatDate(post.createdAt)}
        </Period>
      </ProjectContent>
    </>
  );

  return (
    <ProjectCard $width="256px">
      <CardLink to={`/posts/${post.id}`} {...prefetchHandlers}>
        {body}
      </CardLink>
    </ProjectCard>
  );
}
