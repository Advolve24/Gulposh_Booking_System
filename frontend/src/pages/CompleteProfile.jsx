import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { api } from "../api/http";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { CalendarIcon, CheckCircle } from "lucide-react";
import { format } from "date-fns";

import {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
} from "../lib/location";

import {
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getRecaptchaVerifier,
  clearRecaptchaVerifier,
} from "@/lib/recaptcha";

/* ===================================================== */

export default function CompleteProfile() {
  const { user, init, googleLoginWithToken, firebaseLoginWithToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isGoogleLogin = user?.authProvider === "google";
  const isPhoneLogin = user?.authProvider === "firebase";

  const [loading, setLoading] = useState(false);

  /* ---------------- OTP STATE ---------------- */
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const confirmationRef = useRef(null);

  /* ---------------- LOCATION DATA ---------------- */
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  /* ---------------- VERIFICATION FLAGS ---------------- */
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [emailVerified, setEmailVerified] = useState(
    isGoogleLogin && !!user?.email
  );

  /* ---------------- FORM STATE ---------------- */
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  /* 🚫 BLOCK IF PROFILE COMPLETE */
  useEffect(() => {
    if (user?.profileComplete) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  /* PREFILL */
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      dob: user.dob ? new Date(user.dob) : null,
      address: user.address || "",
      country: user.country || "",
      state: user.state || "",
      city: user.city || "",
      pincode: user.pincode || "",
    });
  }, [user]);

  /* LOCATION DATA */
  useEffect(() => setCountries(getAllCountries()), []);
  useEffect(() => {
    setStates(form.country ? getStatesByCountry(form.country) : []);
    setCities([]);
  }, [form.country]);
  useEffect(() => {
    setCities(
      form.state && form.country
        ? getCitiesByState(form.country, form.state)
        : []
    );
  }, [form.state, form.country]);

  /* =====================================================
     📱 PHONE OTP (GOOGLE USERS)
  ===================================================== */

  const sendPhoneOTP = async () => {
    if (form.phone.length !== 10)
      return toast.error("Enter valid 10-digit mobile number");

    try {
      const appVerifier = getRecaptchaVerifier();
      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        appVerifier
      );
      setOtpSent(true);
      toast.success("OTP sent");
    } catch {
      clearRecaptchaVerifier();
      toast.error("Failed to send OTP");
    }
  };

  const verifyPhoneOTP = async () => {
    if (otp.length !== 6) return toast.error("Enter valid OTP");

    try {
      const credential = PhoneAuthProvider.credential(
        confirmationRef.current.verificationId,
        otp
      );

      const result = await signInWithCredential(auth, credential);
      const idToken = await result.user.getIdToken();

      await firebaseLoginWithToken(idToken);
      await init();

      setPhoneVerified(true);
      setOtpSent(false);
      clearRecaptchaVerifier();
      toast.success("Mobile verified");
    } catch {
      toast.error("Invalid OTP");
    }
  };

  /* =====================================================
     GOOGLE EMAIL VERIFY (PHONE USERS)
  ===================================================== */

  const verifyEmailWithGoogle = async () => {
    try {
      const idToken = await window.signInWithGoogle();
      await googleLoginWithToken(idToken);
      await init();
      setEmailVerified(true);
      toast.success("Email verified");
    } catch {
      toast.error("Email verification failed");
    }
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Full name is required");
    if (!form.dob) return toast.error("DOB is required");

    if (isGoogleLogin && !phoneVerified)
      return toast.error("Verify mobile number");

    if (isPhoneLogin && !emailVerified)
      return toast.error("Verify email");

    try {
      setLoading(true);

      const countryObj = countries.find((c) => c.isoCode === form.country);
      const stateObj = states.find((s) => s.isoCode === form.state);

      await api.put("/auth/me", {
        ...form,
        dob: form.dob.toISOString(),
        country: countryObj?.name || null,
        state: stateObj?.name || null,
      });

      await init();
      toast.success("Profile completed 🎉");

      navigate(location.state?.redirectTo || "/", {
        replace: true,
        state: location.state?.bookingState,
      });
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="rounded-xl border p-5 space-y-6 bg-white">

        <h2 className="text-xl font-semibold">Complete your profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* NAME */}
          <div>
            <Label>Full Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>

          {/* EMAIL */}
          <div>
            <Label>Email</Label>
            <div className="flex gap-2">
              <Input
                value={form.email}
                disabled={emailVerified}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              {emailVerified ? (
                <CheckCircle className="text-green-600 mt-2" />
              ) : isPhoneLogin ? (
                <Button size="sm" onClick={verifyEmailWithGoogle}>
                  Verify
                </Button>
              ) : null}
            </div>
          </div>

          {/* MOBILE */}
          {/* MOBILE */}
          <div>
            <Label>Mobile</Label>

            <div className="flex gap-2">
              <Input
                value={form.phone}
                disabled={phoneVerified}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
              />

              {phoneVerified ? (
                <CheckCircle className="text-green-600 mt-2" />
              ) : isGoogleLogin ? (
                otpSent ? (
                  <Button size="sm" onClick={verifyPhoneOTP}>
                    Verify OTP
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={form.phone.length !== 10}
                    onClick={sendPhoneOTP}
                  >
                    Send OTP
                  </Button>
                )
              ) : null}
            </div>

            {!phoneVerified && isGoogleLogin && (
              <p className="text-xs text-muted-foreground mt-1">
                Mobile number verification required
              </p>
            )}

            {otpSent && !phoneVerified && (
              <Input
                className="mt-2"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            )}
          </div>


          {/* DOB */}
          <div className="sm:col-span-2">
            <Label>Date of Birth</Label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {form.dob ? format(form.dob, "dd MMM yyyy") : "Select date of birth"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="p-0 w-auto">
                <Calendar
                  mode="single"
                  captionLayout="dropdown-buttons"
                  selected={form.dob}
                  onSelect={(date) => {
                    if (!date) return;
                    setForm((f) => ({ ...f, dob: date }));
                  }}
                  fromYear={new Date().getFullYear() - 100}
                  toYear={new Date().getFullYear() - 18}
                  disabled={(date) => {
                    const today = new Date();
                    const minDate = new Date(
                      today.getFullYear() - 100,
                      today.getMonth(),
                      today.getDate()
                    );
                    const maxDate = new Date(
                      today.getFullYear() - 18,
                      today.getMonth(),
                      today.getDate()
                    );

                    return date < minDate || date > maxDate;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <p className="text-xs text-muted-foreground mt-1">
              You must be at least 18 years old
            </p>
          </div>


          {/* COUNTRY */}
          <div>
            <Label>Country</Label>
            <Select
              value={form.country}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, country: v, state: "", city: "" }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.isoCode} value={c.isoCode}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* STATE */}
          <div>
            <Label>State</Label>
            <Select
              value={form.state}
              disabled={!form.country}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, state: v, city: "" }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CITY */}
          <div>
            <Label>City</Label>
            <Select
              value={form.city}
              disabled={!form.state}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, city: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PINCODE */}
          <div>
            <Label>Pincode</Label>
            <Input
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
            />
          </div>

          {/* ADDRESS */}
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>

        </div>

        <Button
          className="w-full"
          onClick={submit}
          disabled={loading || (isGoogleLogin && !phoneVerified)}
        >
          {loading ? "Saving..." : "Save & Continue"}
        </Button>


      </div>
    </div>
  );
}
