import React, { useEffect, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  type: NotificationType;
  message: string;
  duration?: number;
  onClose: () => void;
}

const typeStyles = {
  success: 'bg-green-500/20 border-green-500 text-green-400',
  error: 'bg-red-500/20 border-red-500 text-red-400',
  info: 'bg-blue-500/20 border-blue-500 text-blue-400',
  warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
};

const typeIcons = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start the progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - (100 / (duration / 100));
      });
    }, 100);

    setIntervalId(interval);

    // Set a timeout to close the notification
    const timeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for the fade-out animation
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    if (intervalId) clearInterval(intervalId);
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for the fade-out animation
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-md w-full
        flex items-start p-4 rounded-lg border
        backdrop-blur-md shadow-lg
        transform transition-all duration-300
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${typeStyles[type]}
      `}
    >
      <div className="flex-shrink-0 mr-3">{typeIcons[type]}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        <div className="mt-2 w-full bg-black/20 rounded-full h-1">
          <div
            className={`h-1 rounded-full ${
              type === 'success' ? 'bg-green-400' :
              type === 'error' ? 'bg-red-400' :
              type === 'info' ? 'bg-blue-400' :
              'bg-yellow-400'
            }`}
            style={{ width: `${progress}%`, transition: 'width 100ms linear' }}
          ></div>
        </div>
      </div>
      <button
        onClick={handleClose}
        className="ml-4 flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Notification;