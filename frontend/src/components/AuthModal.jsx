
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../store/authStore";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
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
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { DialogTitle } from "@/components/ui/dialog";



const OTP_TIMER = 60;
const isValidPhone = (v) => /^[0-9]{10}$/.test(v);


export default function AuthModal() {
  const {
    showAuthModal,
    closeAuth,
    phoneLoginWithToken,
    googleLoginWithToken,
  } = useAuth();

  const navigate = useNavigate();

  const [step, setStep] = useState("choice");
  const [form, setForm] = useState({ phone: "", otp: "" });
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TIMER);

  const confirmationRef = useRef(null);
  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);

  const [phoneError, setPhoneError] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const otpInputsRef = useRef([]);


  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      toast.loading("Signing in with Google...", { id: "google" });

      const provider = new GoogleAuthProvider();

      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (err) {
        await signInWithRedirect(auth, provider);
        return;
      }

      const idToken = await result.user.getIdToken(true);

      const user = await googleLoginWithToken(idToken);

      toast.success("Login successful 🎉", { id: "google" });

      closeAuth();
      resumeFlow(user);
    } catch (err) {
      console.error(err);
      console.error("code:", err?.code, "message:", err?.message);
      toast.error("Google login failed", { id: "google" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (!res?.user) return;

        toast.loading("Signing in with Google...", { id: "google" });

        const idToken = await res.user.getIdToken(true);
        const user = await googleLoginWithToken(idToken);

        toast.success("Login successful 🎉", { id: "google" });
        closeAuth();
        resumeFlow(user);
      } catch (err) {
        console.error("getRedirectResult error:", err);
      }
    })();
  }, []);


  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, secondsLeft]);

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
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      const verifier = getRecaptchaVerifier("auth-recaptcha");
      window.recaptchaVerifier = verifier;

      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        verifier
      );

      toast.success("OTP sent", { id: "otp" });
      setTimeout(() => otpInputsRef.current[0]?.focus(), 200);
      setOtpSentTo(form.phone);
      setStep("otp");
      setSecondsLeft(OTP_TIMER);
    } catch {
      toast.error("Failed to send OTP", { id: "otp" });
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };


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
      const { redirectTo, bookingState } = JSON.parse(raw);

      navigate(redirectTo || "/", {
        replace: true,
        state: bookingState || null,
      });
      return;
    }

    navigate("/", { replace: true });
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
      <DialogOverlay className="bg-black/40 backdrop-blur-sm" />

      <DialogContent className="p-0 w-[92vw] max-w-[420px] rounded-3xl overflow-hidden bg-white border-0 shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>Authentication</DialogTitle>
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
                className="w-full h-11 rounded-xl gap-3"
                onClick={() => setStep("phone")}
              >
                <Phone size={18} />
                Continue with Phone
              </Button>
              <div className="relative text-center text-xs text-muted-foreground">
                <span className="bg-white px-2">OR</span>
                <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-10" />
              </div>

              <Button variant="outline" className="w-full h-11 rounded-xl gap-3" onClick={handleGoogleLogin}>
                <FcGoogle size={20} />
                Continue with Google
              </Button>
            </>
          )}

          {step === "phone" && (
            <>
              <div className="space-y-1">
                <Label>Mobile Number</Label>

                <div className="flex items-stretch rounded-xl border overflow-hidden focus-within:ring-1 focus-within:ring-primary">

                  {/* COUNTRY CODE */}
                  <div className="
      flex items-center justify-center
      px-3 bg-muted text-sm font-medium
      border-r min-w-[64px]
    ">
                    +91
                  </div>

                  {/* PHONE INPUT */}
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter mobile number"
                    value={form.phone}
                    className="
        flex-1
        h-12
        px-3
        text-base
        outline-none
        bg-white
      "
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");

                      // Prevent more than 10 digits
                      if (value.length > 10) value = value.slice(0, 10);

                      setForm({ ...form, phone: value });

                      if (value.length === 10) setPhoneError("");
                      else setPhoneError("Enter a valid 10-digit number");
                    }}
                  />
                </div>

                {phoneError && (
                  <p className="text-xs text-red-500 mt-1">{phoneError}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  We will send a verification code to this number
                </p>
              </div>
              <Button
                className="w-full h-12 rounded-xl text-base mt-2"
                onClick={sendOtp}
                disabled={loading || form.phone.length !== 10}
              >
                Send OTP
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Enter verification code</p>
                <p className="text-xs text-muted-foreground">
                  OTP sent to +91 {otpSentTo}
                </p>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => (otpInputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="
        w-11 h-12
        border rounded-lg
        text-center text-lg font-semibold
        focus:outline-none focus:ring-2 focus:ring-primary
      "
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");

                      if (!value) return;

                      const otpArray = form.otp.split("");
                      otpArray[i] = value;
                      const newOtp = otpArray.join("").slice(0, 6);

                      setForm((prev) => ({ ...prev, otp: newOtp }));

                      if (i < 5) otpInputsRef.current[i + 1]?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace") {
                        const otpArray = form.otp.split("");
                        otpArray[i] = "";
                        setForm((prev) => ({ ...prev, otp: otpArray.join("") }));
                        if (i > 0) otpInputsRef.current[i - 1]?.focus();
                      }
                    }}
                  />
                ))}
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base"
                disabled={form.otp.length !== 6 || loading || verifyingRef.current}
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

        <div id="auth-recaptcha" className="hidden" />
      </DialogContent>
    </Dialog>
  );
}




