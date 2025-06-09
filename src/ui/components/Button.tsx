import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'brand' | 'brand-tertiary' | 'default';
  size?: 'small' | 'medium' | 'large';
}

const baseStyles = 'rounded px-4 py-2 font-semibold transition focus:outline-none';
const variants = {
  brand: 'bg-blue-600 text-white hover:bg-blue-700',
  'brand-tertiary': 'bg-transparent border border-blue-400 text-blue-400 hover:bg-blue-50',
  default: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
};
const sizes = {
  small: 'text-xs py-1 px-2',
  medium: 'text-sm py-2 px-4',
  large: 'text-lg py-3 px-6',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  className = '',
  ...props
}) => {
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 