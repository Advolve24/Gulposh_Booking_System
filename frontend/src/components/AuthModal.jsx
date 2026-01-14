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

const OTP_TIMER = 60;
const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);

export default function AuthModal() {
  const { showAuthModal, closeAuth, firebaseLoginWithToken } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("phone"); // phone | otp
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: "", otp: "" });
  const [secondsLeft, setSecondsLeft] = useState(OTP_TIMER);

  const confirmationRef = useRef(null);
  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;

    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [step, secondsLeft]);

  /* ================= CLEAN RESET ================= */
  const resetFlow = () => {
    sendingRef.current = false;
    verifyingRef.current = false;
    confirmationRef.current = null;

    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    setForm({ phone: "", otp: "" });
    setStep("phone");
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
      // ensure single recaptcha instance
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

      if (err?.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait a minute.");
      } else {
        toast.error("Failed to send OTP. Try again.");
      }

      // cleanup on failure
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async () => {
    if (verifyingRef.current) return;

    const otp = form.otp.replace(/\D/g, "");
    if (otp.length !== 6) {
      toast.error("Enter valid 6-digit OTP");
      return;
    }

    if (!confirmationRef.current) {
      toast.error("OTP expired. Please resend.");
      resetFlow();
      return;
    }

    verifyingRef.current = true;
    setLoading(true);

    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken(true);

      const user = await firebaseLoginWithToken(idToken);

      closeAuth();
      toast.success("Welcome to Gulposh ✨");

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
    } catch (err) {
      console.error(err);
      toast.error("Invalid OTP. Please resend.");
      setForm((f) => ({ ...f, otp: "" }));
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

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
      <DialogOverlay className="bg-black/60" />

      <DialogContent className="p-0 w-[92vw] max-w-[380px] rounded-3xl overflow-hidden bg-white border-0">
        <VisuallyHidden>
          <h2>Authentication</h2>
        </VisuallyHidden>

        {/* reCAPTCHA */}
        <div
          id="recaptcha-container"
          className="absolute inset-0 pointer-events-none opacity-0"
        />

        {/* HEADER */}
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
            src="/Gulposh-65-scaled-1.webp"
            alt="Gulposh Villa"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
        </div>

        {/* BODY */}
        <div className="px-5 py-5 space-y-4">
          <h2 className="text-lg font-semibold">
            {step === "phone" ? "Sign in" : "Verify OTP"}
          </h2>

          {step === "phone" && (
            <>
              <Label>Mobile Number</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="Enter 10 digit phone number"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />

              <Button
                className="w-full h-11 bg-[#a11d2e]"
                onClick={sendOtp}
                disabled={loading}
              >
                {loading ? "Sending..." : "Continue"}
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <Label>Enter OTP</Label>
              <Input
                className="h-11 text-center tracking-[0.35em] font-semibold"
                inputMode="numeric"
                autoFocus
                value={form.otp}
                onChange={(e) =>
                  setForm({
                    ...form,
                    otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
              />

              <Button
                className="w-full h-11 bg-[#a11d2e]"
                onClick={verifyOtp}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>

              <div className="text-xs text-center text-muted-foreground">
                {secondsLeft > 0 ? (
                  <>Resend OTP in <b>{secondsLeft}s</b></>
                ) : (
                  <button
                    onClick={sendOtp}
                    className="text-primary underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
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
