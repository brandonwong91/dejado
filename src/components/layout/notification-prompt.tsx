'use client';

import { useEffect } from 'react';
import { useNotificationPermission } from '@/hooks/use-notification-permission';

export function NotificationPrompt() {
  const { request } = useNotificationPermission();
  useEffect(() => {
    request();
  }, []);
  return null;
}
