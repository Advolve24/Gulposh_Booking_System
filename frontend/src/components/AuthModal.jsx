import { useState, useEffect } from "react";
import { useAuth } from "../store/authStore";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getRecaptchaVerifier,
  clearRecaptchaVerifier,
} from "@/lib/recaptcha";

const OTP_TIMER = 60;
const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);

export default function AuthModal() {
  const { showAuthModal, closeAuth, firebaseLoginWithToken } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("phone"); // phone | otp
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: "", otp: "" });
  const [secondsLeft, setSecondsLeft] = useState(OTP_TIMER);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, secondsLeft]);

  /* ================= RESET ================= */
  const resetFlow = () => {
    clearRecaptchaVerifier();
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
      clearRecaptchaVerifier();
      const verifier = getRecaptchaVerifier();

      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        verifier
      );

      window.confirmationResult = confirmation;
      setStep("otp");
      setSecondsLeft(OTP_TIMER);
      toast.success("OTP sent");
    } catch {
      clearRecaptchaVerifier();
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async (otpValue = form.otp) => {
    if (otpValue.length !== 6) return;

    try {
      setLoading(true);
      const result = await window.confirmationResult.confirm(otpValue);
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
    } catch {
      toast.error("Invalid or expired OTP");
      setForm((f) => ({ ...f, otp: "" }));
    } finally {
      setLoading(false);
    }
  };

  /* ================= AUTO VERIFY ================= */
  useEffect(() => {
    if (step === "otp" && form.otp.length === 6) {
      verifyOtp(form.otp);
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
        className="
          p-0
          sm:max-w-[420px]
          rounded-3xl
          overflow-hidden
          bg-white
          shadow-[0_50px_120px_-30px_rgba(0,0,0,0.7)]
          border border-black/10
        "
      >
        {/* CLOSE BUTTON — ALWAYS VISIBLE */}
        <button
          onClick={() => {
            resetFlow();
            closeAuth();
          }}
          className="
            absolute
            right-4 top-4
            z-30
            rounded-full
            bg-white/90
            p-1.5
            shadow-md
            hover:bg-white
            transition
          "
        >
          <X className="h-4 w-4 text-black" />
        </button>

        {/* IMAGE HEADER */}
        <div className="relative h-56">
          <img
            src="/Gulposh-65-scaled-1.webp"
            alt="Gulposh Villa"
            className="h-full w-full object-cover"
          />
          {/* luxury overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          <div className="absolute inset-0 ring-1 ring-white/10" />

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <h3 className="text-xl font-serif font-semibold">
              Gulposh Luxury Villa
            </h3>
            <p className="text-xs text-white/85 mt-1">
              Experience elegance. Book effortlessly.
            </p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-6 py-6 space-y-5 bg-[#f6f4f1]">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              {step === "phone" ? "Sign in or Create Account" : "Verify OTP"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "phone"
                ? "Continue with your mobile number"
                : `OTP sent to +91 ${form.phone}`}
            </p>
          </div>

          {step === "phone" && (
            <div className="space-y-4">
              <div>
                <Label>Mobile Number</Label>
                <Input
                  className="mt-2 h-12 rounded-xl"
                  placeholder="Enter 10-digit number"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                />
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base bg-[#a11d2e] hover:bg-[#8e1827]"
                onClick={sendOtp}
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Continue"}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <div>
                <Label>Enter OTP</Label>
                <Input
                  className="
                    mt-2
                    h-12
                    rounded-xl
                    text-center
                    tracking-[0.35em]
                    font-semibold
                  "
                  placeholder="••••••"
                  inputMode="numeric"
                  value={form.otp}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                />
              </div>

              <div className="text-center text-xs text-muted-foreground">
                {secondsLeft > 0 ? (
                  <>Resend OTP in <b>{secondsLeft}s</b></>
                ) : (
                  <button
                    onClick={sendOtp}
                    className="text-primary font-medium hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-white px-6 py-3 text-center text-[11px] text-muted-foreground border-t">
          🔒 Secured login • No spam • Privacy protected
        </div>
      </DialogContent>
    </Dialog>
  );
}
