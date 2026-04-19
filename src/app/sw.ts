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
//
// The page sends SCHEDULE_TIMER / CANCEL_TIMER messages. All notification work
// happens entirely inside the SW thread — never via registration.showNotification()
// from the page context, which Chrome intercepts on Share-Target PWAs and
// replaces with its own "Tap to Copy the URL" template.
//
// Live countdown: an updating notification is shown immediately so the user
// can glance at the notification shade to see how much rest time remains.
// It refreshes every 15 s (silent, same tag → replaces previous entry).
// The final "Rest over!" fires with renotify:true (vibrates/sounds again).

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

let timerResolve: (() => void) | null = null;
let finalTimerId: ReturnType<typeof setTimeout> | null = null;
let countdownIntervalId: ReturnType<typeof setInterval> | null = null;

async function clearAllTimers() {
  if (finalTimerId !== null) {
    clearTimeout(finalTimerId);
    finalTimerId = null;
  }
  if (countdownIntervalId !== null) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  if (timerResolve !== null) {
    timerResolve();
    timerResolve = null;
  }
  // Dismiss any live-countdown notification left in the tray
  try {
    const notifs = await self.registration.getNotifications({
      tag: 'rest-timer'
    });
    notifs.forEach((n) => n.close());
  } catch {}
}

async function showCountdown(endTime: number) {
  const remaining = Math.ceil((endTime - Date.now()) / 1000);
  if (remaining <= 0) return;
  try {
    await self.registration.showNotification('⏱ Rest Timer', {
      body: `${fmtTime(remaining)} remaining — keep resting`,
      tag: 'rest-timer',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      silent: true, // no buzz on countdown ticks
      renotify: false,
      data: { navigate: '/workouts' }
    } as NotificationOptions);
  } catch {}
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const msg = event.data as { type: string; endTime?: number };

  if (msg.type === 'SCHEDULE_TIMER' && msg.endTime) {
    const endTime = msg.endTime;

    // Wrap everything in event.waitUntil so the browser keeps the SW alive
    // for the full duration of the rest period.
    event.waitUntil(
      (async () => {
        await clearAllTimers();

        await new Promise<void>((resolve) => {
          timerResolve = resolve;

          // 1. Show the initial countdown notification immediately
          showCountdown(endTime);

          // 2. Refresh it every 15 s so the tray stays accurate
          countdownIntervalId = setInterval(() => {
            showCountdown(endTime);
          }, 15_000);

          // 3. At T=0 → fire the "Rest over!" notification
          const delay = Math.max(0, endTime - Date.now());
          finalTimerId = setTimeout(async () => {
            if (countdownIntervalId !== null) {
              clearInterval(countdownIntervalId);
              countdownIntervalId = null;
            }
            finalTimerId = null;
            timerResolve = null;

            try {
              await self.registration.showNotification('Rest over! 💪', {
                body: 'Time to get back to your next set.',
                tag: 'rest-timer',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                renotify: true, // vibrate/sound again
                data: { navigate: '/workouts' }
              } as NotificationOptions);
            } catch {}

            resolve();
          }, delay);
        });
      })()
    );
  }

  if (msg.type === 'CANCEL_TIMER') {
    event.waitUntil(clearAllTimers());
  }
});

// ── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl: string =
    (event.notification.data as { navigate?: string })?.navigate ?? '/workouts';

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
