import React from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ 
  label, 
  description,
  className = '',
  checked,
  onChange,
  ...props 
}) => {
  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
          {...props}
        />
        <div className={`
          w-5 h-5 border rounded 
          flex items-center justify-center
          transition-all duration-200
          ${checked 
            ? 'bg-cyan-500 border-cyan-500' 
            : 'bg-black/30 border-gray-600/50 hover:border-cyan-400/50'
          }
        `}>
          {checked && (
            <svg 
              className="w-3 h-3 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="ml-2">
          {label && <div className="text-sm font-medium text-white">{label}</div>}
          {description && <div className="text-xs text-gray-400">{description}</div>}
        </div>
      )}
    </label>
  );
};

export default Checkbox;