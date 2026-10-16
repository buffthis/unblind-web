import HoverImage from '@components/common/HoverImage';
import useHoverPrefetch, { usePrefetchPost } from '@hooks/usePrefetch';
import {
  Period,
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
import styled, { css, useTheme } from 'styled-components';

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
  // The same corner radius as the images in the post body and its top thumbnail.
  const { md: radius } = useTheme().radius;

  const body = (
    <>
      <ProjectImageContainer $ratio="16 / 9" $shadow="none" $radius={radius}>
        <HoverImage
          baseImage={thumbnail.src}
          alt={post.title}
          showButton={false}
        />
      </ProjectImageContainer>
      {/* The text starts where the corner of the thumbnail stops curving. */}
      <ProjectContent $inset={radius}>
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
