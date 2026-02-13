import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "../store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, ShieldCheck } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";
import { Country, State, City } from "country-state-city";




export default function MyAccount() {
  const navigate = useNavigate();


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    dob: null,
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  const [initialForm, setInitialForm] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [phone, setPhone] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");

  const [otpStep, setOtpStep] = useState("idle");
  const [otp, setOtp] = useState("");
  const [confirmRef, setConfirmRef] = useState(null);


  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [countryCode, setCountryCode] = useState("IN");
  const [stateCode, setStateCode] = useState("");
  const [cityName, setCityName] = useState("");

  const logout = useAuth((s) => s.logout);
  const setUser = useAuth((s) => s.setUser);


  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");

        const allCountries = Country.getAllCountries();
        setCountries(allCountries);

        const countryObj =
          allCountries.find((c) => c.name === data.country) ||
          allCountries.find((c) => c.isoCode === "IN");

        const countryISO = countryObj?.isoCode || "IN";
        const stateList = State.getStatesOfCountry(countryISO);

        const stateObj = stateList.find((s) => s.name === data.state);
        const stateISO = stateObj?.isoCode || "";

        const cityList = stateISO
          ? City.getCitiesOfState(countryISO, stateISO)
          : [];

        setCountryCode(countryISO);
        setStates(stateList);
        setStateCode(stateISO);
        setCities(cityList);
        setCityName(data.city || "");

        const loaded = {
          name: data.name || "",
          email: data.email || "",
          dob: data.dob ? new Date(data.dob) : null,
          address: data.address || "",
          country: countryObj?.name || "",
          state: data.state || "",
          city: data.city || "",
          pincode: data.pincode || "",
        };

        setForm(loaded);
        setInitialForm({
          ...loaded,
          dob: loaded.dob ? loaded.dob.toISOString() : null,
        });

        setPhone(data.phone || "");
        setOriginalPhone(data.phone || "");
      } catch (err) {
        if (err?.response?.status === 401) {
          navigate("/", { replace: true });
          return;
        }

        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  useEffect(() => {
    if (!initialForm) return;

    const current = {
      ...form,
      dob: form.dob ? form.dob.toISOString() : null,
    };

    setHasChanges(JSON.stringify(current) !== JSON.stringify(initialForm));
  }, [form, initialForm]);

  const phoneChanged = phone !== originalPhone;

  const onCountryChange = (code) => {
    const country = countries.find((c) => c.isoCode === code);

    setCountryCode(code);
    setStateCode("");
    setCityName("");

    setStates(State.getStatesOfCountry(code));
    setCities([]);

    setForm((f) => ({
      ...f,
      country: country?.name || "",
      state: "",
      city: "",
    }));
  };

  const onStateChange = (code) => {
    const state = states.find((s) => s.isoCode === code);

    setStateCode(code);
    setCityName("");

    setCities(City.getCitiesOfState(countryCode, code));

    setForm((f) => ({
      ...f,
      state: state?.name || "",
      city: "",
    }));
  };

  const onCityChange = (name) => {
    setCityName(name);
    setForm((f) => ({ ...f, city: name }));
  };

  const sendOtp = async () => {
    if (!/^[0-9]{10}$/.test(phone)) {
      toast.error("Enter valid 10-digit phone number");
      return;
    }

    try {
      const verifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${phone}`,
        verifier
      );

      setConfirmRef(confirmation);
      setOtpStep("sent");
      toast.success("OTP sent");
    } catch {
      toast.error("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    if (!confirmRef) return;

    try {
      const result = await confirmRef.confirm(otp);
      const idToken = await result.user.getIdToken(true);

      await api.post(
        "/auth/phone-login",
        {},
        {
          headers: { Authorization: `Bearer ${idToken}` },
          withCredentials: true,
        }
      );

      setOtpStep("verified");
      setOriginalPhone(phone);
      toast.success("Phone number verified");
    } catch {
      toast.error("Invalid OTP");
    }
  };


  const onSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.dob) return toast.error("Date of birth is required");
    if (phoneChanged && otpStep !== "verified")
      return toast.error("Verify phone before saving");

    try {
      setSaving(true);

      await api.put("/auth/me", {
        name: form.name,
        email: form.email || null,
        phone,
        dob: form.dob.toISOString(),
        address: form.address || null,
        country: form.country || null,
        state: form.state || null,
        city: form.city || null,
        pincode: form.pincode || null,
      });

      setInitialForm({
        ...form,
        dob: form.dob.toISOString(),
      });

      setEditMode(false);
      setHasChanges(false);
      setOtpStep("idle");
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };


  const onDeleteAccount = async () => {
    if (!confirm("This will permanently delete your account. Continue?"))
      return;

    try {
      setDeleting(true);
      await api.delete("/auth/me");
      toast.success("Account deleted successfully");
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };



  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const initials =
    form.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div id="recaptcha-container" />

      <div className="text-center">
        <h1 className="text-3xl font-semibold">My Account</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information
        </p>
      </div>

      <Card className="rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Profile</h2>

          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={saving || !hasChanges}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold">
            {initials}
          </div>
          <div>
            <div className="text-lg font-semibold">{form.name}</div>
            <div className="text-sm text-muted-foreground">{form.email}</div>
          </div>
        </div>

        <Separator />

        {/* FORM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <Label>Name</Label>
            <Input disabled={!editMode} value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <Label>Email</Label>
            <Input disabled={!editMode} value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          <div>
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={!editMode} className="w-full justify-between">
                  {form.dob ? format(form.dob, "dd MMM yyyy") : "Select date"}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                  selected={form.dob}
                  onSelect={(d) => setForm(f => ({ ...f, dob: d }))}
                  className="year-first-calendar"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              disabled={!editMode}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                setOtpStep("idle");
              }}
            />
            {editMode && phoneChanged && otpStep === "idle" && (
              <Button size="sm" variant="outline" onClick={sendOtp}>
                Verify Phone
              </Button>
            )}
            {otpStep === "sent" && (
              <div className="flex gap-2 mt-2">
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} />
                <Button size="sm" onClick={verifyOtp}>Verify</Button>
              </div>
            )}
            {otpStep === "verified" && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Verified
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input disabled={!editMode} value={form.address}
              onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>

          <div>
            <Label>Country</Label>
            <Select disabled={!editMode} value={countryCode} onValueChange={onCountryChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>State</Label>
            <Select disabled={!editMode || !states.length} value={stateCode} onValueChange={onStateChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {states.map(s => (
                  <SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>City</Label>
            <Select disabled={!editMode || !cities.length} value={cityName} onValueChange={onCityChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cities.map((c, i) => (
                  <SelectItem key={i} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Pincode</Label>
            <Input disabled={!editMode} value={form.pincode}
              onChange={(e) =>
                setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))
              } />
          </div>
        </div>
      </Card>

      <Card className="border-red-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account
            </p>
          </div>
          <Button variant="destructive" onClick={onDeleteAccount} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete Account"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
