// src/lib/recaptcha.js
import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "./firebase";

let recaptchaVerifier = null;

export const getRecaptchaVerifier = () => {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "normal", // ✅ REQUIRED for iOS Safari
      callback: () => {
        console.log("reCAPTCHA verified");
      },
      "expired-callback": () => {
        console.log("reCAPTCHA expired");
      },
    }
  );

  // ❗ MUST render explicitly
  recaptchaVerifier.render();

  return recaptchaVerifier;
};

export const clearRecaptchaVerifier = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
};
