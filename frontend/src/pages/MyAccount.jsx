import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile, changeMyPassword } from "../api/user";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function MyAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState(null);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

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

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        email,
        phone,
        dob: dob ? dob.toISOString() : null,
      };
      const updated = await updateMyProfile(payload);
      setName(updated.name || "");
      setEmail(updated.email || "");
      setPhone(updated.phone || "");
      setDob(updated.dob ? new Date(updated.dob) : null);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (!curPw || !newPw) return toast.error("Enter current and new password");
    if (newPw.length < 6) return toast.error("New password must be at least 6 characters");
    if (newPw !== newPw2) return toast.error("Passwords do not match");

    setPwSaving(true);
    try {
      await changeMyPassword({ currentPassword: curPw, newPassword: newPw });
      toast.success("Password changed");
      setCurPw("");
      setNewPw("");
      setNewPw2("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold">My account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
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

          <div className="pt-2">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="font-medium">Change password</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Current password</Label>
                <Input type="password" className="mt-2" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
              </div>
              <div>
                <Label>New password</Label>
                <Input type="password" className="mt-2" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Confirm new password</Label>
                <Input type="password" className="mt-2" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
              </div>
            </div>
            <Button variant="secondary" onClick={onChangePassword} disabled={pwSaving}>
              {pwSaving ? "Updating..." : "Update password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
