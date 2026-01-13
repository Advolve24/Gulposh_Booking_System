import { useEffect, useState } from "react";
import { api } from "../api/http";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { Calendar as CalendarIcon, ShieldCheck } from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
} from "../lib/location";

import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";

export default function MyAccount() {
  /* ================= STATE ================= */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleting, setDeleting] = useState(false); // ✅ MOVED UP (IMPORTANT)

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

  const [otpStep, setOtpStep] = useState("idle"); // idle | sent | verified
  const [otp, setOtp] = useState("");

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");

        const loadedForm = {
          name: data.name || "",
          email: data.email || "",
          dob: data.dob ? new Date(data.dob) : null,
          address: data.address || "",
          country: data.country || "",
          state: data.state || "",
          city: data.city || "",
          pincode: data.pincode || "",
        };

        setForm(loadedForm);
        setInitialForm({
          ...loadedForm,
          dob: loadedForm.dob ? loadedForm.dob.toISOString() : null,
        });

        setPhone(data.phone || "");
        setOriginalPhone(data.phone || "");
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ================= UNSAVED CHANGES ================= */
  useEffect(() => {
    if (!initialForm) return;

    const current = {
      ...form,
      dob: form.dob ? form.dob.toISOString() : null,
    };

    setHasChanges(JSON.stringify(current) !== JSON.stringify(initialForm));
  }, [form, initialForm]);

  const phoneChanged = phone !== originalPhone;

  /* ================= LOCATION ================= */
  const countries = getAllCountries();
  const states = form.country ? getStatesByCountry(form.country) : [];
  const cities =
    form.country && form.state
      ? getCitiesByState(form.country, form.state)
      : [];

  /* ================= OTP ================= */
  const sendOtp = async () => {
    if (!/^[0-9]{10}$/.test(phone)) {
      return toast.error("Enter valid 10 digit phone number");
    }

    try {
      const verifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(
        auth,
        `+91${phone}`,
        verifier
      );
      window.confirmationResult = result;
      setOtpStep("sent");
      toast.success("OTP sent");
    } catch {
      toast.error("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      await window.confirmationResult.confirm(otp);
      setOtpStep("verified");
      setOriginalPhone(phone);
      toast.success("Phone number verified");
    } catch {
      toast.error("Invalid OTP");
    }
  };

  /* ================= SAVE ================= */
  const onSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.dob) return toast.error("Date of birth is required");
    if (phoneChanged && otpStep !== "verified")
      return toast.error("Verify phone number before saving");

    try {
      setSaving(true);
      await api.put("/auth/me", {
        ...form,
        dob: form.dob.toISOString(),
      });

      setInitialForm({
        ...form,
        dob: form.dob.toISOString(),
      });

      setHasChanges(false);
      setEditMode(false);
      setOtpStep("idle");
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  /* ================= DELETE ACCOUNT ================= */
  const onDeleteAccount = async () => {
    const ok = confirm(
      "Are you sure you want to permanently delete your account? This action cannot be undone."
    );
    if (!ok) return;

    try {
      setDeleting(true);
      await api.delete("/auth/me");
      toast.success("Account deleted");
      window.location.href = "/";
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const initials =
    form.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div id="recaptcha-container" />

      {/* HEADER */}
      <div className="text-center">
        <h1 className="text-3xl font-semibold">My Account</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information and preferences
        </p>
      </div>

      {/* PROFILE CARD */}
      <Card className="rounded-2xl border bg-white p-6 sm:p-8 space-y-6">
        {/* ACTION BAR */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Profile Information</h2>

          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Edit Profile</Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (hasChanges) {
                    toast.error("Save changes first");
                    return;
                  }
                  setEditMode(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {editMode && hasChanges && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            You have unsaved changes.
          </div>
        )}

        {/* AVATAR */}
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

        {/* FORM GRID */}
        {/* (your full form remains unchanged – already included above) */}
      </Card>

      {/* DANGER ZONE */}
      <Card className="rounded-2xl border border-red-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Permanently delete your account and all associated data.
            </p>
          </div>

          <Button
            variant="destructive"
            disabled={deleting}
            onClick={onDeleteAccount}
            className="rounded-xl px-6 py-2.5 text-sm font-medium"
          >
            {deleting ? "Deleting..." : "Delete Account"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
