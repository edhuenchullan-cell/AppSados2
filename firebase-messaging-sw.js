importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDOm5fi_fZtLxLMlZUH1LUqIOTl6yqoTKE",
  authDomain:        "appsados.firebaseapp.com",
  projectId:         "appsados",
  storageBucket:     "appsados.firebasestorage.app",
  messagingSenderId: "867122636110",
  appId:             "1:867122636110:web:c6a9f24c1b9c44fcbeea1f"
});

const messaging = firebase.messaging();
const ICON = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'AppSados', {
    body:    body || '',
    icon:    ICON,
    vibrate: [200, 100, 200],
    data:    payload.data || {},
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const appUrl = 'https://app-sados2.vercel.app';
      const open   = list.find(c => c.url.startsWith(appUrl) && 'focus' in c);
      return open ? open.focus() : clients.openWindow(appUrl);
    })
  );
});
