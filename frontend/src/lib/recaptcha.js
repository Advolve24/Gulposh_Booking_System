import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "./firebase";

let recaptchaVerifier = null;

export const getRecaptchaVerifier = () => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
      }
    );
  }
  return recaptchaVerifier;
};
