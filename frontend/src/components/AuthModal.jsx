import { useState, useEffect, useRef } from "react";
import { useAuth } from "../store/authStore";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";

/* =====================================================
   CONSTANTS
===================================================== */

const OTP_TIMER = 60;
const isValidPhone = (v) => /^[0-9]{10}$/.test(v);

/* =====================================================
   COMPONENT
===================================================== */

export default function AuthModal() {
  const {
    showAuthModal,
    closeAuth,
    phoneLoginWithToken,
    googleLoginWithToken,
  } = useAuth();

  const navigate = useNavigate();

  const [step, setStep] = useState("choice"); // choice | phone | otp
  const [form, setForm] = useState({ phone: "", otp: "" });
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TIMER);

  const confirmationRef = useRef(null);
  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);
  const googleRenderedRef = useRef(false);

  /* =====================================================
     GOOGLE CALLBACK
  ===================================================== */

  const handleGoogleResponse = async (response) => {
    try {
      setLoading(true);
      const user = await googleLoginWithToken(response.credential);
      closeAuth();
      toast.success("Welcome to Gulposh ✨");
      handlePostAuthRedirect(user);
    } catch {
      toast.error("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     GOOGLE SCRIPT INIT (SAFE)
  ===================================================== */

  useEffect(() => {
    if (!showAuthModal || googleRenderedRef.current) return;

    if (!window.google?.accounts?.id) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    } else {
      initGoogle();
    }

    function initGoogle() {
      if (googleRenderedRef.current) return;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });

      const el = document.getElementById("google-btn");
      if (el) {
        window.google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
        });
        googleRenderedRef.current = true;
      }
    }
  }, [showAuthModal]);

  /* =====================================================
     OTP TIMER
  ===================================================== */

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, secondsLeft]);

  /* =====================================================
     POST AUTH REDIRECT
  ===================================================== */
const handlePostAuthRedirect = (user) => {
  // 🚨 ABSOLUTE RULE: NEW / INCOMPLETE PROFILE
  if (!user.profileComplete) {
    navigate("/complete-profile", { replace: true });
    return;
  }

  // ✅ EXISTING USER FLOW
  const raw = sessionStorage.getItem("postAuthRedirect");
  sessionStorage.removeItem("postAuthRedirect");

  if (raw) {
    const { redirectTo, bookingState } = JSON.parse(raw);
    navigate(redirectTo || "/", {
      replace: true,
      state: bookingState || null,
    });
    return;
  }

  navigate("/", { replace: true });
};


  /* =====================================================
     RESET FLOW (CRITICAL)
  ===================================================== */

  const resetFlow = () => {
    confirmationRef.current = null;
    sendingRef.current = false;
    verifyingRef.current = false;

    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    setForm({ phone: "", otp: "" });
    setStep("choice");
    setSecondsLeft(OTP_TIMER);
    setLoading(false);
  };

  /* =====================================================
     SEND OTP
  ===================================================== */

  const sendOtp = async () => {
    if (sendingRef.current) return;

    if (!isValidPhone(form.phone)) {
      toast.error("Enter valid 10-digit mobile number");
      return;
    }

    sendingRef.current = true;
    setLoading(true);

    try {
      const verifier =
        window.recaptchaVerifier || getRecaptchaVerifier();

      window.recaptchaVerifier = verifier;

      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        verifier
      );

      setStep("otp");
      setSecondsLeft(OTP_TIMER);
      toast.success("OTP sent");
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  /* =====================================================
     VERIFY OTP
  ===================================================== */

  const verifyOtp = async () => {
    if (verifyingRef.current) return;

    const otp = form.otp.replace(/\D/g, "");
    if (otp.length !== 6) return;

    verifyingRef.current = true;
    setLoading(true);

    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken(true);

      const user = await phoneLoginWithToken(idToken);
      closeAuth();
      toast.success("Welcome to Gulposh ✨");
      handlePostAuthRedirect(user);
    } catch {
      toast.error("Invalid OTP");
      setForm((f) => ({ ...f, otp: "" }));
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     AUTO VERIFY OTP
  ===================================================== */

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

  /* =====================================================
     UI
  ===================================================== */

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
          className="absolute inset-0 opacity-0 pointer-events-none"
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
            alt="Gulposh"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="px-5 py-5 space-y-4">
          <h2 className="text-lg font-semibold">Sign in</h2>

          {step === "choice" && (
            <>
              <Button
                variant="outline"
                className="w-full h-10 rounded-3xl"
                onClick={() => setStep("phone")}
              >
                Continue with Mobile OTP
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                or
              </div>

              <div className="flex justify-center">
                <div id="google-btn" />
              </div>
            </>
          )}

          {step === "phone" && (
            <>
              <Label>Mobile Number</Label>
              <Input
                placeholder="Enter 10-digit mobile number"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />

              <Button
                className="w-full h-11 rounded-xl"
                onClick={sendOtp}
                disabled={loading}
              >
                Send OTP
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <Label>Enter OTP</Label>
              <Input
                placeholder="6-digit OTP"
                value={form.otp}
                onChange={(e) =>
                  setForm({ ...form, otp: e.target.value })
                }
              />

              <Button
                className="w-full h-11 rounded-xl"
                disabled={loading || form.otp.length !== 6}
                onClick={verifyOtp}
              >
                Verify OTP
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                {secondsLeft > 0 ? (
                  `Resend OTP in ${secondsLeft}s`
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={sendOtp}
                    disabled={loading}
                  >
                    Resend OTP
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-2 text-center text-[11px] border-t text-muted-foreground">
          🔒 Secure login • No spam • Privacy protected
        </div>
      </DialogContent>
    </Dialog>
  );
}
