/* eslint-disable no-undef */

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB97BpKMqpMCijUMWLGoR0GoLiYf8HmOWo",
  authDomain: "gulposh-phone-login.firebaseapp.com",
  projectId: "gulposh-phone-login",
  messagingSenderId: "66870094356",
  appId: "1:66870094356:web:210730c2666ab54c045501",
});

const messaging = firebase.messaging();

/**
 * 🔔 Background notification handler
 * (works when admin tab is closed)
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Background message:", payload);

  const title =
    payload.notification?.title || "Gulposh Admin Notification";

  const options = {
    body: payload.notification?.body || "",
    icon: "/logo1.png",
    badge: "/logo1.png",
    data: payload.data || {}, // 👈 important for click handling
  };

  self.registration.showNotification(title, options);
});

/**
 * 👉 Click on notification → open admin panel
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = "https://gulposhadminsystem.netlify.app/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});