import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import React from 'react';
import { FaStar } from 'react-icons/fa';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  20% {
    transform: scale(1.10);
  }
  100% {
    transform: scale(1);
  }
`;

export const PulseAnimation = styled.div`
  animation: ${pulse} 2s infinite;
`;

// 기본 애니메이션 변형
const defaultVariants = {
  hidden: {
    opacity: 0,
    y: 50,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const ScrollAnimation = ({
  children,
  variants = defaultVariants,
  delay = 0,
  margin = '0px',
  once = true,
  className = '',
}) => {
  // reducedMotion lives here rather than at the app root, so the root never imports
  // framer-motion and it stays out of the entry chunk.
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{
          once,
          margin,
          amount: 'some', // 요소가 하나라도 보일 때 애니메이션 시작
        }}
        variants={{
          ...variants,
          visible: {
            ...variants.visible,
            transition: {
              ...variants.visible.transition,
              delay,
            },
          },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
};

// --- StarRatingAnimation ---
const StarContainer = styled(motion.div)`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const Star = styled(motion.span)`
  color: ${({ $color }) => $color || '#FFD700'};
  font-size: ${({ $size }) => $size || '1.3rem'};
  margin: 0 4px;
  text-shadow: 0 0 8px #ffd70088;
`;

const getStarVariants = (direction) => {
  if (direction === 'x') {
    return {
      hidden: { opacity: 0, x: -20, scale: 0.8 },
      visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      },
      exit: { opacity: 0, x: 20, scale: 0.8, transition: { duration: 0.18 } },
    };
  }
  // 기본은 y축
  return {
    hidden: { opacity: 0, y: -20, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    },
    exit: { opacity: 0, y: 20, scale: 0.8, transition: { duration: 0.18 } },
  };
};

export function StarRatingAnimation({
  show,
  count = 5,
  size = '1.3rem',
  color = '#FFD700',
  animationDirection = 'y',
  style = {},
}) {
  const starVariants = getStarVariants(animationDirection);
  const starContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: { staggerDirection: -1, staggerChildren: 0.08 },
    },
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {show && (
          <StarContainer
            variants={starContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={style}
          >
            {Array.from({ length: count }).map((_, i) => (
              <Star key={i} variants={starVariants} $size={size} $color={color}>
                <FaStar />
              </Star>
            ))}
          </StarContainer>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
