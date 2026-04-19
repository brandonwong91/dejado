'use client';

import { useEffect } from 'react';
import { getUnreadDailySummaryAction } from '@/features/notifications/actions/daily-summary';
import { sendNotification } from '@/lib/notifications';

/**
 * Invisible component — mounts in the dashboard shell and fires the daily
 * summary notification once per day if the cron has generated one.
 *
 * Waits 3 s after mount so the page is interactive and notification
 * permission is already in a stable state before we try to show it.
 */
export function DailySummaryNotifier() {
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const summary = await getUnreadDailySummaryAction();
        if (!summary) return;
        sendNotification(summary.title, summary.body, 'daily-summary', '/');
      } catch {
        // Silently ignore — notification is best-effort
      }
    }, 3_000);

    return () => clearTimeout(t);
  }, []);

  return null;
}
