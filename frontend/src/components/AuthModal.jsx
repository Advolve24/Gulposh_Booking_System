import { useState, useEffect, useRef } from "react";
import { useAuth } from "../store/authStore";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";
import { api } from "@/api/http";

const OTP_TIMER = 60;
const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);

export default function AuthModal() {
  const { showAuthModal, closeAuth, firebaseLoginWithToken } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("choice");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: "", otp: "" });
  const [secondsLeft, setSecondsLeft] = useState(OTP_TIMER);

  const confirmationRef = useRef(null);
  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);
  const googleRenderedRef = useRef(false);

  /* ================= GOOGLE CALLBACK (🔥 MISSING PART) ================= */
  const handleGoogleResponse = async (response) => {
    try {
      setLoading(true);

      const res = await api.post("/auth/google-login", {
        idToken: response.credential,
      });

      closeAuth();
      toast.success("Welcome to Gulposh ✨");
      handlePostAuthRedirect(res.data);
    } catch (err) {
      console.error("Google login failed:", err);
      toast.error("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= GOOGLE INIT & RENDER ================= */
  useEffect(() => {
    if (!showAuthModal || googleRenderedRef.current) return;

    const loadGoogleScript = () =>
      new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;

        document.body.appendChild(script);
      });

    loadGoogleScript()
      .then(() => {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        const container = document.getElementById("google-btn");
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: 320,
          });
          googleRenderedRef.current = true;
        }
      })
      .catch(() => {
        console.error("Failed to load Google OAuth script");
      });
  }, [showAuthModal]);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [step, secondsLeft]);

  /* ================= POST AUTH REDIRECT ================= */
  const handlePostAuthRedirect = (user) => {
    const raw = sessionStorage.getItem("postAuthRedirect");
    sessionStorage.removeItem("postAuthRedirect");

    if (raw) {
      const { redirectTo, bookingState } = JSON.parse(raw);
      if (!user.profileComplete) {
        navigate("/complete-profile", {
          replace: true,
          state: { redirectTo, bookingState },
        });
        return;
      }
      navigate(redirectTo, { replace: true, state: bookingState });
      return;
    }
    navigate("/", { replace: true });
  };

  /* ================= CLEAN RESET ================= */
  const resetFlow = () => {
    sendingRef.current = false;
    verifyingRef.current = false;
    confirmationRef.current = null;
    googleRenderedRef.current = false;

    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    setForm({ phone: "", otp: "" });
    setStep("choice");
    setSecondsLeft(OTP_TIMER);
    setLoading(false);
  };

  /* ================= SEND OTP ================= */
  const sendOtp = async () => {
    if (sendingRef.current) return;
    if (!isValidPhone(form.phone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    sendingRef.current = true;
    setLoading(true);

    try {
      const verifier =
        window.recaptchaVerifier ||
        getRecaptchaVerifier(auth, "recaptcha-container");

      window.recaptchaVerifier = verifier;

      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        verifier
      );

      confirmationRef.current = confirmation;
      setStep("otp");
      setSecondsLeft(OTP_TIMER);
      toast.success("OTP sent successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send OTP. Try again.");
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async () => {
    if (verifyingRef.current) return;

    const otp = form.otp.replace(/\D/g, "");
    if (otp.length !== 6) return;

    verifyingRef.current = true;
    setLoading(true);

    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken(true);
      const user = await firebaseLoginWithToken(idToken);

      closeAuth();
      toast.success("Welcome to Gulposh ✨");
      handlePostAuthRedirect(user);
    } catch (err) {
      toast.error("Invalid OTP. Please resend.");
      setForm((f) => ({ ...f, otp: "" }));
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  /* ================= AUTO VERIFY OTP ================= */
  useEffect(() => {
    if (
      step === "otp" &&
      form.otp.length === 6 &&
      confirmationRef.current &&
      !verifyingRef.current &&
      !loading
    ) {
      verifyOtp();
    }
  }, [form.otp, step]);

  return (
    <Dialog
      open={showAuthModal}
      onOpenChange={(open) => {
        if (!open) {
          resetFlow();
          closeAuth();
        }
      }}
    >
      <DialogOverlay className="bg-black/10" />

      <DialogContent className="p-0 w-[92vw] max-w-[380px] rounded-3xl overflow-hidden bg-white border-0">
        <VisuallyHidden>
          <h2>Authentication</h2>
        </VisuallyHidden>

        <div
          id="recaptcha-container"
          className="absolute inset-0 pointer-events-none opacity-0"
        />

        <div className="relative h-48">
          <button
            onClick={() => {
              resetFlow();
              closeAuth();
            }}
            className="absolute right-4 top-4 z-30 rounded-full bg-white/90 p-1.5"
          >
            <X className="h-4 w-4 text-black" />
          </button>

          <img
            src="/login-popup.webp"
            alt="Gulposh Villa"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="px-5 py-5 space-y-4">
          <h2 className="text-lg font-semibold">Sign in</h2>

          {step === "choice" && (
            <>
              <div className="flex justify-center">
                <div id="google-btn" />
              </div>

              <div className="text-center text-xs text-muted-foreground">
                or
              </div>

              <Button
                variant="outline"
                className="w-full h-11 rounded-xl"
                onClick={() => setStep("phone")}
              >
                Continue with Mobile OTP
              </Button>
            </>
          )}
        </div>

        <div className="px-4 py-2 text-center text-[11px] border-t text-muted-foreground">
          🔒 Secured login • No spam • Privacy protected
        </div>
      </DialogContent>
    </Dialog>
  );
}
