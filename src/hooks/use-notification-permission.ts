'use client';

import { useState } from 'react';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window))
      return 'unsupported';
    return Notification.permission;
  });

  const request = async () => {
    if (permission !== 'default') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  return { permission, request };
}
