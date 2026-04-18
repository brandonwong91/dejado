/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache
});

serwist.addEventListeners();

// ── Background Rest Timer ────────────────────────────────────────────────────
// The main thread posts SCHEDULE_TIMER / CANCEL_TIMER messages here so the
// notification fires from the SW thread even when the screen is locked and
// the page's JS is throttled or frozen by the browser.

let pendingTimerResolve: (() => void) | null = null;
let pendingTimerId: ReturnType<typeof setTimeout> | null = null;

function clearPendingTimer() {
  if (pendingTimerId !== null) {
    clearTimeout(pendingTimerId);
    pendingTimerId = null;
  }
  if (pendingTimerResolve !== null) {
    pendingTimerResolve();
    pendingTimerResolve = null;
  }
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type: string; endTime?: number };

  if (data.type === 'SCHEDULE_TIMER' && data.endTime) {
    clearPendingTimer();

    const delay = Math.max(0, data.endTime - Date.now());

    // event.waitUntil keeps the SW alive until the promise resolves,
    // preventing the browser from terminating it before the timer fires.
    event.waitUntil(
      new Promise<void>((resolve) => {
        pendingTimerResolve = resolve;
        pendingTimerId = setTimeout(async () => {
          pendingTimerId = null;
          pendingTimerResolve = null;
          try {
            await self.registration.showNotification('Rest over! 💪', {
              body: 'Time to get back to your next set.',
              tag: 'rest-timer',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              renotify: true,
              // 'navigate' instead of 'url' — Chrome replaces the notification
              // body with "Tap to Copy the URL" on Share-Target PWAs when it
              // finds a 'url' key in the notification data object.
              data: { navigate: '/workouts' }
            } as NotificationOptions);
          } catch {
            // Notification permission may have been revoked
          }
          resolve();
        }, delay);
      })
    );
  }

  if (data.type === 'CANCEL_TIMER') {
    clearPendingTimer();
  }
});

// ── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl: string =
    (event.notification.data as { navigate?: string })?.navigate ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            client.url.includes(self.location.origin) &&
            'navigate' in client
          ) {
            (client as WindowClient).navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
