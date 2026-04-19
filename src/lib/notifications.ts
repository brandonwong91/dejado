// NOTE: Do NOT use registration.showNotification() from page context.
// On Chrome Android, PWAs with share_target registered in their manifest
// have all page-context SW notifications intercepted by Chrome, which
// replaces the notification body with its own "Tap to Copy the URL" template.
// Use new Notification() from the page, and self.registration.showNotification()
// only from within Service Worker code.
export async function sendNotification(
  title: string,
  body: string,
  tag: string,
  _url: string,
  options?: Partial<NotificationOptions>
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return;

  const notifOptions = {
    body,
    tag,
    icon: '/icon-192.png',
    renotify: true,
    ...options
  } as NotificationOptions;

  new Notification(title, notifOptions);
}
