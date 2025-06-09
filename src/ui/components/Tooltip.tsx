import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionStyles = {
  top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-3',
  bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-3',
  left: 'right-full top-1/2 transform -translate-y-1/2 mr-3',
  right: 'left-full top-1/2 transform -translate-y-1/2 ml-3',
};

export const Tooltip: React.FC<TooltipProps> = ({ 
  text, 
  children, 
  position = 'top' 
}) => (
  <div className="group relative inline-block">
    {children}
    <div className={`absolute ${positionStyles[position]} px-3 py-1 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[1000] shadow-lg`}>
      {text}
    </div>
  </div>
);

export default Tooltip;