import React from 'react';

interface IconWithBackgroundProps {
  icon: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

const sizeMap = {
  small: 'w-7 h-7 text-base',
  medium: 'w-10 h-10 text-xl',
  large: 'w-14 h-14 text-2xl',
};

export const IconWithBackground: React.FC<IconWithBackgroundProps> = ({ icon, size = 'medium' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full bg-cyan-400/20 shadow-[0_0_12px_2px_rgba(6,230,230,0.5)] ${sizeMap[size]}`}
  >
    {icon}
  </span>
);

export default IconWithBackground; 