import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "gulposh-phone-login.firebaseapp.com",
  projectId: "gulposh-phone-login",
  storageBucket: "gulposh-phone-login.appspot.com",
  messagingSenderId: "66870094356", 
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);
