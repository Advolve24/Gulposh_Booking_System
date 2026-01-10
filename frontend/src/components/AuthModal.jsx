import { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getRecaptchaVerifier,
  clearRecaptchaVerifier,
} from "@/lib/recaptcha";

const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);

export default function AuthModal() {
  const { showAuthModal, closeAuth, firebaseLoginWithToken, user } = useAuth();

  const [step, setStep] = useState("phone"); // phone | otp
  const [mode, setMode] = useState("signin"); // signin | signup
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    phone: "",
    otp: "",
    name: "",
    dob: null,
  });

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

    // 🔐 Extra validation ONLY for signup
    if (mode === "signup") {
      if (!form.name.trim()) {
        toast.error("Name is required for sign up");
        return;
      }
      if (!form.dob) {
        toast.error("Date of birth is required for sign up");
        return;
      }
    }

    try {
      setLoading(true);

      // Firebase OTP verification
      const result = await window.confirmationResult.confirm(form.otp);
      const idToken = await result.user.getIdToken(true);

      // Backend login/signup decision
      const res = await firebaseLoginWithToken(idToken, {
        name: form.name || undefined,
        dob: form.dob ? form.dob.toISOString() : undefined,
      });

      if (res?.isNewUser) {
        toast.success("Account created successfully 🎉");
      } else {
        toast.success("Logged in successfully 🎉");
      }

      closeAuth();
    } catch (err) {
      console.error(err);
      toast.error("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PREFILL USER ================= */
  useEffect(() => {
    if (user?.phone) {
      setForm((f) => ({
        ...f,
        phone: user.phone,
        name: user.name || "",
        dob: user.dob ? new Date(user.dob) : null,
      }));
    }
  }, [user]);

  /* ================= AUTO MODE DECISION ================= */
  useEffect(() => {
    // If name & dob already exist → existing user
    if (form.name || form.dob) {
      setMode("signin");
    } else {
      setMode("signup");
    }
  }, [form.name, form.dob]);

  return (
    <Dialog open={showAuthModal} onOpenChange={(o) => !o && closeAuth()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "phone"
              ? mode === "signup"
                ? "Create your account"
                : "Login with Mobile"
              : "Verify OTP"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? mode === "signup"
                ? "New here? Verify your number to sign up"
                : "Welcome back! Enter your mobile number"
              : "Enter the OTP sent to your mobile"}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: PHONE */}
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
                  setForm((f) => ({
                    ...f,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
              />
            </div>

            {/* ONLY FOR SIGNUP */}
            {mode === "signup" && (
              <>
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label>Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {form.dob ? format(form.dob, "PPP") : "Select date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.dob}
                        onSelect={(date) =>
                          setForm((f) => ({ ...f, dob: date }))
                        }
                        fromYear={1950}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <Button className="w-full" onClick={sendOtp} disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
          </div>
        )}

        {/* STEP 2: OTP */}
        {step === "otp" && (
          <div className="space-y-4">
            <div>
              <Label>Enter OTP</Label>
              <Input
                inputMode="numeric"
                placeholder="6-digit OTP"
                value={form.otp}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
              />
            </div>

            <Button className="w-full" onClick={verifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setStep("phone")}
            >
              Change mobile number
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
