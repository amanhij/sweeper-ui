import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'brand' | 'brand-tertiary' | 'default';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

const baseStyles = 'rounded px-4 py-2 font-semibold transition focus:outline-none flex items-center justify-center';
const variants = {
  brand: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 shadow-glow',
  'brand-tertiary': 'bg-transparent border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 shadow-glow-sm',
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
  loading = false,
  ...props
}) => {
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
      {loading && (
        <span className="ml-2 inline-block animate-spin">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
    </button>
  );
};

export default Button; 