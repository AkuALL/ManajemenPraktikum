/* global importScripts, firebase, clients */
const appRoutes = new Set(['/presensi', '/schedule', '/kehadiran', '/review-izin']);

self.addEventListener('notificationclick', (event) => {
  if (event.notification.data?.source !== 'practicum') return;
  event.notification.close();
  const { route, sessionId } = event.notification.data;
  const target = new URL(appRoutes.has(route) ? route : '/', self.location.origin);
  if (route === '/presensi' && sessionId) target.searchParams.set('sessionId', sessionId);

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url === target.href);
    if (existing) return existing.focus();
    return clients.openWindow(target.href);
  })());
});

importScripts(
  'https://www.gstatic.com/firebasejs/13.4.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging-compat.js',
);

const params = new URL(self.location.href).searchParams;
firebase.initializeApp(Object.fromEntries(params));
firebase.messaging().onBackgroundMessage(({ data }) => {
  if (!data?.title) return;
  return self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/favicon.ico',
    tag: data.eventId,
    data: { source: 'practicum', route: data.route, sessionId: data.sessionId },
  });
});
