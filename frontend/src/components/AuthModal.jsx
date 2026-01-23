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
import { X, ShieldCheck, Phone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
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
  const googleReadyRef = useRef(false);

  /* =====================================================
     LOAD GOOGLE SCRIPT ONCE
  ===================================================== */

  useEffect(() => {
    if (googleReadyRef.current) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      googleReadyRef.current = true;
    };

    document.body.appendChild(script);
  }, []);

  /* =====================================================
     GOOGLE LOGIN (TOKEN BASED – STABLE)
  ===================================================== */

  const handleGoogleLogin = () => {
    if (!window.google) {
      toast.error("Google not ready. Try again.");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (res) => {
        try {
          setLoading(true);
          toast.loading("Signing in with Google...", { id: "google" });

          const user = await googleLoginWithToken(res.credential);

          toast.success("Login successful 🎉", { id: "google" });
          closeAuth();

          resumeFlow(user);
        } catch {
          toast.error("Google login failed", { id: "google" });
        } finally {
          setLoading(false);
        }
      },
    });

    window.google.accounts.id.prompt();
  };

  /* =====================================================
     OTP TIMER
  ===================================================== */

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, secondsLeft]);

  /* =====================================================
     RESET FLOW
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
    toast.loading("Sending OTP...", { id: "otp" });

    try {
      const verifier =
        window.recaptchaVerifier || getRecaptchaVerifier();
      window.recaptchaVerifier = verifier;

      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        verifier
      );

      toast.success("OTP sent", { id: "otp" });
      setStep("otp");
      setSecondsLeft(OTP_TIMER);
    } catch {
      toast.error("Failed to send OTP", { id: "otp" });
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
    if (form.otp.length !== 6) return;

    verifyingRef.current = true;
    setLoading(true);
    toast.loading("Verifying OTP...", { id: "verify" });

    try {
      const result = await confirmationRef.current.confirm(form.otp);
      const idToken = await result.user.getIdToken(true);

      const user = await phoneLoginWithToken(idToken);

      toast.success("Login successful 🎉", { id: "verify" });
      closeAuth();

      resumeFlow(user);
    } catch {
      toast.error("Invalid OTP", { id: "verify" });
      setForm((f) => ({ ...f, otp: "" }));
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
   AUTO VERIFY OTP WHEN 6 DIGITS ENTERED
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
     RESUME ORIGINAL FLOW
  ===================================================== */

  const resumeFlow = (user) => {
    const raw = sessionStorage.getItem("postAuthRedirect");
    sessionStorage.removeItem("postAuthRedirect");

    if (!user.profileComplete) {
      navigate("/complete-profile", {
        replace: true,
        state: raw ? JSON.parse(raw) : null,
      });
      return;
    }

    if (raw) {
      const { redirectTo, state } = JSON.parse(raw);
      navigate(redirectTo || "/", {
        replace: true,
        state: state || null,
      });
      return;
    }

    navigate("/", { replace: true });
  };

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

      <DialogContent className="p-0 w-[92vw] max-w-[420px] rounded-3xl overflow-hidden bg-white border-0 shadow-2xl">
        <VisuallyHidden>
          <h2>Authentication</h2>
        </VisuallyHidden>

        <button
          onClick={() => {
            resetFlow();
            closeAuth();
          }}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-1.5 shadow"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative h-48">
          <img
            src="/login-popup.webp"
            alt="Gulposh"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Login / Sign up</h3>
            <p className="text-xs text-muted-foreground">
              Secure bookings • Trusted stays
            </p>
          </div>

          {step === "choice" && (
            <>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl"
                onClick={() => setStep("phone")}
              >
                Continue with Mobile OTP
              </Button>

              <div className="relative text-center text-xs text-muted-foreground">
                <span className="bg-white px-2">OR</span>
                <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-10" />
              </div>

              <Button variant="outline" className="w-full h-11 rounded-xl gap-3"  onClick={handleGoogleLogin}>
                  <FcGoogle size={20} />
                  Continue with Google
                </Button>
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
                  setForm({
                    ...form,
                    otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
              />

              <Button
                className="w-full h-11 rounded-xl"
                disabled={loading || verifyingRef.current}
                onClick={verifyOtp}
              >
                Verify & Continue
              </Button>


              <div className="text-center text-xs text-muted-foreground">
                {secondsLeft > 0
                  ? `Resend OTP in ${secondsLeft}s`
                  : (
                    <button
                      onClick={sendOtp}
                      className="underline"
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  )}
              </div>
            </>
          )}

          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-2">
            <ShieldCheck className="h-3 w-3" />
            Secure & OTP protected login
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
