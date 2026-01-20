import { useEffect, useState } from "react";
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

/* ===================================================== */

export default function CompleteProfile() {
  const { user, init, googleLoginWithToken, firebaseLoginWithToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isGoogleLogin = user?.authProvider === "google";
  const isPhoneLogin = user?.authProvider === "firebase";

  const [loading, setLoading] = useState(false);

  /* ---------------- LOCATION DATA ---------------- */
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  /* ---------------- VERIFICATION FLAGS ---------------- */
  const [phoneVerified, setPhoneVerified] = useState(
    isPhoneLogin && !!user?.phone
  );
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
     🔐 VERIFICATION ACTIONS
  ===================================================== */

  /* PHONE OTP (Google users only) */
  const verifyPhoneOTP = async () => {
    try {
      // 👉 You already have Firebase OTP modal
      // Just trigger it here
      toast.message("Verify phone number via OTP");

      // After success:
      setPhoneVerified(true);
    } catch {
      toast.error("Phone verification failed");
    }
  };

  /* GOOGLE EMAIL VERIFY (Phone OTP users only) */
  const verifyEmailWithGoogle = async () => {
    try {
      toast.message("Verify email using Google");

      // 👉 Use same Google login popup
      const idToken = await window.signInWithGoogle(); // your existing Google popup
      await googleLoginWithToken(idToken);

      await init();
      setEmailVerified(true);

      toast.success("Email verified successfully");
    } catch {
      toast.error("Email verification failed");
    }
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Full name is required");
    if (!form.dob) return toast.error("Date of birth is required");

    if (isGoogleLogin && !phoneVerified)
      return toast.error("Please verify your phone number");

    if (isPhoneLogin && !emailVerified)
      return toast.error("Please verify your email");

    try {
      setLoading(true);

      const countryObj = countries.find((c) => c.isoCode === form.country);
      const stateObj = states.find((s) => s.isoCode === form.state);

      await api.put("/auth/me", {
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        dob: form.dob.toISOString(),
        address: form.address || null,
        country: countryObj?.name || null,
        state: stateObj?.name || null,
        city: form.city || null,
        pincode: form.pincode || null,
      });

      await init();

      toast.success("Profile completed successfully 🎉");

      const redirectTo = location.state?.redirectTo || "/";
      navigate(redirectTo, {
        replace: true,
        state: location.state?.bookingState,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save profile");
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

        <div>
          <h2 className="text-xl font-semibold">Complete your profile</h2>
          <p className="text-sm text-muted-foreground">
            Required to proceed with bookings
          </p>
        </div>

        {/* ---------------- FORM ---------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <Label>Full Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
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

          <div>
            <Label>Mobile Number</Label>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
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
                <Button size="sm" onClick={verifyPhoneOTP}>
                  Verify
                </Button>
              ) : null}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {form.dob ? format(form.dob, "PPP") : "Select date"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Calendar
                  mode="single"
                  selected={form.dob}
                  onSelect={(d) =>
                    setForm((f) => ({ ...f, dob: d }))
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

           <div>
            <Label>Country</Label>
            <Select
              value={form.country}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  country: v,
                  state: "",
                  city: "",
                }))
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

          <div>
            <Label>State</Label>
            <Select
              value={form.state}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, state: v, city: "" }))
              }
              disabled={!form.country}
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

          <div>
            <Label>City</Label>
            <Select
              value={form.city}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, city: v }))
              }
              disabled={!form.state}
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

          <div>
            <Label>Pincode</Label>
            <Input
              inputMode="numeric"
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
            />
          </div>

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

        <Button className="w-full" onClick={submit} disabled={loading}>
          {loading ? "Saving..." : "Save & Continue"}
        </Button>

      </div>
    </div>
  );
}
