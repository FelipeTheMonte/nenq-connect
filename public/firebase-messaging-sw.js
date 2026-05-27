importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyD84wWbq19Oad-v-0khwHw8rsz557_vhTU",
  authDomain:        "nenq-connect.firebaseapp.com",
  projectId:         "nenq-connect",
  storageBucket:     "nenq-connect.firebasestorage.app",
  messagingSenderId: "94957767711",
  appId:             "1:94957767711:web:72e10dd94e18332fa2592a",
});

const messaging = firebase.messaging();

// Notificação quando o app está em background
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
  });
});
