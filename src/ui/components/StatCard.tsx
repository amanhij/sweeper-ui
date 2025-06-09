import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: {
    value: string | number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  className = '',
}) => {
  return (
    <div className={`
      bg-black/30 backdrop-blur-sm 
      border border-cyan-400/20 
      rounded-xl p-4 
      shadow-glow-sm
      hover:shadow-glow
      transition-all duration-300
      ${className}
    `}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
        {icon && <div className="text-cyan-400">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-white">{value}</div>
        {change && (
          <div className={`
            flex items-center text-xs font-medium
            ${change.isPositive ? 'text-green-400' : 'text-red-400'}
          `}>
            {change.isPositive ? (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {change.value}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;