import React from 'react';

interface SlcLionCrestProps {
  className?: string;
}

/**
 * Official Sri Lanka Cricket Lion emblem logo.
 */
export const SlcLionCrest: React.FC<SlcLionCrestProps> = ({ className = 'h-10 w-10' }) => {
  return (
    <img
      src={`${import.meta.env.BASE_URL}slc-logo.png`}
      alt="Sri Lanka Cricket Logo"
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );
};
