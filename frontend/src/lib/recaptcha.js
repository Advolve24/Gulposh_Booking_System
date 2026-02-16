import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "./firebase";

export const getRecaptchaVerifier = (containerId) => {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {}
    window.recaptchaVerifier = null;
  }

  const verifier = new RecaptchaVerifier(
    auth,
    containerId,
    {
      size: "invisible",
      callback: () => {},
    }
  );

  verifier.render();

  window.recaptchaVerifier = verifier;
  return verifier;
};
