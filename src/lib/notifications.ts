export async function sendNotification(
  title: string,
  body: string,
  tag: string,
  url: string,
  options?: Partial<NotificationOptions>
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return;

  const notifOptions = {
    body,
    tag,
    icon: '/icon-192.png',
    renotify: true,
    // Use 'navigate' instead of 'url' — Chrome intercepts notifications whose
    // data contains a 'url' key on Share-Target PWAs and replaces the body
    // with its own "Tap to Copy the URL" template.
    data: { navigate: url },
    ...options
  } as NotificationOptions;

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, notifOptions);
      return;
    } catch {
      // fall through to basic notification
    }
  }

  new Notification(title, notifOptions);
}
