import { useState, useEffect, useRef } from "react";
import { useAuth } from "../store/authStore";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
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

  const verifyingRef = useRef(false); // 🔐 prevents double verify

  /* ================= TIMER ================= */
  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, secondsLeft]);

  /* ================= RESET ================= */
  const resetFlow = () => {
    verifyingRef.current = false;
    window.confirmationResult = null;
    setForm({ phone: "", otp: "" });
    setStep("phone");
    setSecondsLeft(OTP_TIMER);
  };

  /* ================= SEND OTP ================= */
  const sendOtp = async () => {
    if (!isValidPhone(form.phone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);

      // ✅ Create reCAPTCHA ONCE and reuse
      const verifier = getRecaptchaVerifier(auth, "recaptcha-container");
      await verifier.render();

      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        verifier
      );

      window.confirmationResult = confirmation;
      setStep("otp");
      setSecondsLeft(OTP_TIMER);
      toast.success("OTP sent");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async () => {
    if (verifyingRef.current) return;
    if (form.otp.length !== 6) return;

    verifyingRef.current = true;

    try {
      setLoading(true);

      const result = await window.confirmationResult.confirm(form.otp);
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
      verifyingRef.current = false;
      toast.error("Invalid or expired OTP");
      setForm((f) => ({ ...f, otp: "" }));
    } finally {
      setLoading(false);
    }
  };

  /* ================= AUTO VERIFY (SAFE) ================= */
  useEffect(() => {
    if (step === "otp" && form.otp.length === 6) {
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
      <DialogContent
        className="p-0 sm:max-w-[420px] rounded-3xl overflow-hidden bg-white"
      >
        {/* ACCESSIBILITY FIX */}
        <VisuallyHidden>
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription>Login or verify OTP</DialogDescription>
        </VisuallyHidden>

        {/* REQUIRED for Firebase */}
        <div id="recaptcha-container" />

        {/* CLOSE */}
        <button
          onClick={() => {
            resetFlow();
            closeAuth();
          }}
          className="absolute right-4 top-4 z-30 rounded-full bg-white p-1.5"
        >
          <X className="h-4 w-4" />
        </button>

        {/* IMAGE */}
        <div className="relative h-56">
          <img
            src="/Gulposh-65-scaled-1.webp"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
          <div className="absolute bottom-5 left-6 text-white">
            <h3 className="text-xl font-serif">Gulposh Luxury Villa</h3>
            <p className="text-xs opacity-90">
              Experience elegance. Book effortlessly.
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 py-6 space-y-5 bg-[#f6f4f1]">
          <h2 className="text-xl font-semibold">
            {step === "phone" ? "Sign in" : "Verify OTP"}
          </h2>

          {step === "phone" && (
            <>
              <Label>Mobile Number</Label>
              <Input
                className="h-12 rounded-xl"
                value={form.phone}
                inputMode="numeric"
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />
              <Button
                className="w-full h-12 bg-[#a11d2e]"
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
                className="h-12 text-center tracking-[0.35em]"
                value={form.otp}
                inputMode="numeric"
                onChange={(e) =>
                  setForm({
                    ...form,
                    otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
              />

              <div className="text-xs text-center">
                {secondsLeft > 0
                  ? `Resend in ${secondsLeft}s`
                  : (
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
      </DialogContent>
    </Dialog>
  );
}
