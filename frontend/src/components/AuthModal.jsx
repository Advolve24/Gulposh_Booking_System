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

  const verifyingRef = useRef(false);

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

  /* ================= VERIFY OTP (MANUAL ONLY) ================= */
  const verifyOtp = async () => {
    if (verifyingRef.current) return;
    if (form.otp.length !== 6) {
      toast.error("Enter 6-digit OTP");
      return;
    }

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
      console.error(err);
      toast.error("Invalid or expired OTP");
      setForm((f) => ({ ...f, otp: "" }));
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
      <DialogContent
        className="
          p-0
          w-[92vw]
          max-w-[380px]
          rounded-3xl
          overflow-hidden
          bg-white
        "
      >
        {/* ACCESSIBILITY */}
        <VisuallyHidden>
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription>Login or verify OTP</DialogDescription>
        </VisuallyHidden>

        {/* REQUIRED FOR FIREBASE */}
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
        <div className="relative h-48">
          <img
            src="/Gulposh-65-scaled-1.webp"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-lg font-serif">Gulposh Luxury Villa</h3>
            <p className="text-xs opacity-90">
              Experience elegance. Book effortlessly.
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className="px-5 py-5 space-y-4 bg-[#f6f4f1]">
          <h2 className="text-lg font-semibold">
            {step === "phone" ? "Sign in" : "Verify OTP"}
          </h2>

          {step === "phone" && (
            <>
              <Label>Mobile Number</Label>
              <Input
                className="h-11 rounded-xl"
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
                    className="text-primary font-medium underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-white px-4 py-2 text-center text-[11px] text-muted-foreground border-t">
          🔒 Secured login • No spam • Privacy protected
        </div>
      </DialogContent>
    </Dialog>
  );
}
