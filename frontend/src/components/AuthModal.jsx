import { useState } from "react";
import { useAuth } from "../store/authStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getRecaptchaVerifier,
  clearRecaptchaVerifier,
} from "@/lib/recaptcha";

const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);

export default function AuthModal() {
  const { showAuthModal, closeAuth, firebaseLoginWithToken } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("phone"); // phone | otp
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    phone: "",
    otp: "",
  });

  /* ================= RESET FLOW ================= */
  const resetFlow = () => {
    clearRecaptchaVerifier();
    window.confirmationResult = null;
    setForm({ phone: "", otp: "" });
    setStep("phone");
  };

  /* ================= SEND OTP ================= */
  const sendOtp = async () => {
    if (!isValidPhone(form.phone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);

      const appVerifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        appVerifier
      );

      window.confirmationResult = confirmation;
      setStep("otp");
      toast.success("OTP sent successfully");
    } catch (err) {
      console.error(err);
      clearRecaptchaVerifier();
      toast.error("Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async () => {
    if (!form.otp || form.otp.length !== 6) {
      toast.error("Enter valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const result = await window.confirmationResult.confirm(form.otp);
      const idToken = await result.user.getIdToken(true);

      // 🔥 AuthStore handles profile redirect
      await firebaseLoginWithToken(idToken, navigate);

      toast.success("Logged in successfully 🎉");
      closeAuth();
    } catch (err) {
      console.error(err);
      clearRecaptchaVerifier();
      window.confirmationResult = null;
      toast.error("Invalid or expired OTP. Please try again.");
      setStep("phone");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "phone" ? "Sign in / Sign up" : "Verify OTP"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "Enter your mobile number to continue"
              : "Enter the OTP sent to your mobile"}
          </DialogDescription>
        </DialogHeader>

        {/* PHONE STEP */}
        {step === "phone" && (
          <div className="space-y-4">
            <div>
              <Label>Mobile Number</Label>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />
            </div>

            <Button className="w-full" onClick={sendOtp} disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
          </div>
        )}

        {/* OTP STEP */}
        {step === "otp" && (
          <div className="space-y-4">
            <div>
              <Label>Enter OTP</Label>
              <Input
                inputMode="numeric"
                placeholder="6-digit OTP"
                value={form.otp}
                onChange={(e) =>
                  setForm({
                    ...form,
                    otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
              />
            </div>

            <Button className="w-full" onClick={verifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={resetFlow}
            >
              Change mobile number
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
