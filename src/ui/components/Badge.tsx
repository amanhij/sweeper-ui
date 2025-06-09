import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium';
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-500/20 text-gray-300',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  info: 'bg-cyan-500/20 text-cyan-300',
};

const sizeStyles = {
  small: 'text-xs px-1.5 py-0.5',
  medium: 'text-sm px-2 py-1',
};

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'small',
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;