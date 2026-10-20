import HoverImage from '@components/common/HoverImage';
import useHoverPrefetch, { usePrefetchPost } from '@hooks/usePrefetch';
import {
  ProjectCard,
  ProjectContent,
  ProjectDescription,
  ProjectImageContainer,
  ProjectTitle,
} from '@styles/compositions/Project.styles';
import tagChip, { TAG_LINE_HEIGHT } from '@styles/tagChip';
import { normalizeTags } from '@utils/tags';
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

const TAG_GAP = 5;

// One row only: a tag that does not fit wraps below the row and is clipped with it,
// so every card is as tall as the next. The first tag starts at the left edge of the
// thumbnail: it has a background of its own, so it is lined up by its edge, while the
// text above it is inset to where the thumbnail corner stops curving.
const CardTags = styled.ul`
  display: flex;
  flex-wrap: wrap;
  max-height: ${TAG_LINE_HEIGHT}px;
  margin-top: 8px;
  margin-left: -${({ $inset }) => $inset};
  overflow: hidden;
  list-style: none;
`;

const CardTag = styled.li`
  margin-right: ${TAG_GAP}px;
  ${tagChip}
`;

export default function PostCard({ post }) {
  const thumbnail = splitThumbnail(post.thumbnail?.url);
  const prefetchHandlers = useHoverPrefetch(usePrefetchPost(post.id));
  // The same corner radius as the images in the post body and its top thumbnail.
  const { md: radius } = useTheme().radius;

  const tags = normalizeTags(post.tags);

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
        {tags.length > 0 && (
          <CardTags aria-label="태그" $inset={radius}>
            {tags.map((tag) => (
              <CardTag key={tag}>{tag}</CardTag>
            ))}
          </CardTags>
        )}
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
