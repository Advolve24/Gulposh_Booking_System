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

messaging.onBackgroundMessage((payload) => {
  console.log("[FCM] Background message", payload);

  const { title, body } = payload.notification || {};

  self.registration.showNotification(title || "Admin Notification", {
    body,
    icon: "/logo1.png",
  });
});
