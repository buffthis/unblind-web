import { css, keyframes } from 'styled-components';

// The post page plays its entrance once per post, top to bottom: the header
// pieces, the thumbnail, then the first screen of body blocks, while the toc
// fills in beside them. Everything rises like the scroll reveal does, so the
// eye follows one direction.
export const ENTRANCE_STEP = 75;
export const ENTRANCE_DURATION = 600;

// The body blocks pick up where the thumbnail leaves off.
export const BODY_ENTRANCE = {
  start: 5 * ENTRANCE_STEP,
  step: ENTRANCE_STEP,
  max: 9 * ENTRANCE_STEP,
};

const rise = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
`;

// The toc only nudges down a little so it does not compete with the article.
const drop = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
`;

// The toc rule draws downward, its tip reaching each item as that item starts.
const grow = keyframes`
  from {
    transform: scaleY(0);
  }
`;

// Applies only under an ancestor marked data-entrance. `backwards` holds the
// starting frame through the delay so nothing flashes in before its turn.
function entranceOf(motion, delay, timing = `${ENTRANCE_DURATION}ms ease-out`) {
  return css`
    @media (prefers-reduced-motion: no-preference) {
      [data-entrance] & {
        animation: ${motion} ${timing} ${delay}ms backwards;
      }
    }
  `;
}

export const riseIn = (order) => entranceOf(rise, order * ENTRANCE_STEP);

export const dropIn = (delay) => entranceOf(drop, delay);

// Linear, so the tip keeps the same pace as the evenly spaced items.
export const growDown = (delay, duration) =>
  entranceOf(grow, delay, `${duration}ms linear`);
