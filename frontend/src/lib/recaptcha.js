import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "./firebase";

let recaptchaVerifier;

export const getRecaptchaVerifier = () => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
        callback: () => {
        },
      }
    );
  }
  return recaptchaVerifier;
};

// export const clearRecaptchaVerifier = () => {
//   if (recaptchaVerifier) {
//     recaptchaVerifier.clear();
//     recaptchaVerifier = null;
//   }
// };