import React, { useState, useCallback } from 'react';
import Notification, { NotificationType } from './Notification';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationManagerProps {
  maxNotifications?: number;
}

const NotificationManager: React.FC<NotificationManagerProps> & {
  notify: (type: NotificationType, message: string, duration?: number) => void;
} = ({ maxNotifications = 3 }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  return (
    <>
      {notifications.slice(0, maxNotifications).map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </>
  );
};

// Static method to add notifications
NotificationManager.notify = (type: NotificationType, message: string, duration = 5000) => {
  // Example implementation using the duration parameter
  console.log(`Notification: ${type} - ${message} (Duration: ${duration}ms)`);
};

export default NotificationManager;