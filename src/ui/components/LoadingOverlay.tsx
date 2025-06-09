import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  message = 'Loading...' 
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-black/70 border border-cyan-400/30 rounded-xl p-8 max-w-md w-full mx-4 flex flex-col items-center shadow-glow">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-cyan-400 animate-spin"></div>
          <div className="absolute inset-1 rounded-full border-r-2 border-l-2 border-cyan-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          <div className="absolute inset-2 rounded-full border-t-2 border-b-2 border-cyan-200 animate-spin" style={{ animationDuration: '2s' }}></div>
          <div className="absolute inset-3 rounded-full border-r-2 border-l-2 border-cyan-100 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2.5s' }}></div>
        </div>
        <p className="text-cyan-300 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;