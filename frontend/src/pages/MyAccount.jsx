import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "../api/user";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function MyAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState(null);

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    (async () => {
      try {
        const me = await getMyProfile();
        setId(me.id);
        setName(me.name || "");
        setEmail(me.email || "");
        setPhone(me.phone || "");
        setDob(me.dob ? new Date(me.dob) : null);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ================= SAVE PROFILE ================= */
  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        email,
        dob: dob ? dob.toISOString() : null,
      };

      const updated = await updateMyProfile(payload);

      setName(updated.name || "");
      setEmail(updated.email || "");
      setDob(updated.dob ? new Date(updated.dob) : null);

      toast.success("Profile updated successfully");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold">
        My Account
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <Label>Email (optional)</Label>
              <Input
                className="mt-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                className="mt-2 bg-muted cursor-not-allowed"
                value={phone}
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Phone number cannot be changed (OTP based login)
              </p>
            </div>

            <div>
              <Label>Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start mt-2 text-left font-normal ${
                      !dob && "text-muted-foreground"
                    }`}
                  >
                    {dob ? format(dob, "PPP") : "Select date of birth"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dob}
                    onSelect={setDob}
                    captionLayout="dropdown"
                    fromYear={1950}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="pt-3">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
