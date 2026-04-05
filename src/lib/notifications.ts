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
    renotify: true,
    data: { url },
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
