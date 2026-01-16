import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

export default function UserEditDialog({ open, onOpenChange, user, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || user.mobile || "",
        dob: user.dob ? new Date(user.dob) : null,
      });
    }
  }, [user]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[95vw] md:max-w-xl
          rounded-2xl
          [&>button]:hidden px-4 py-4
        "
      >
        {/* HEADER */}
        <div className="relative border-b px-5 py-2">
          <DialogTitle className="text-lg font-semibold">
            Edit User
          </DialogTitle>

          {/* CUSTOM CLOSE BUTTON */}
          <button
            onClick={() => onOpenChange(false)}
            className="
              absolute top-0 right-0
              h-8 w-8
              rounded-full
              border
              flex items-center justify-center
              hover:bg-muted
              transition
            "
          >
            <X size={14} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>

          <Field label="Email">
            <Input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>

          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>

          <Field label="DOB">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {form.dob ? format(form.dob, "PPP") : "Select DOB"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="p-0">
                <Calendar
                  mode="single"
                  selected={form.dob}
                  onSelect={(d) => update("dob", d)}
                  captionLayout="dropdown"
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </Field>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================= UI HELPER ================= */

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
