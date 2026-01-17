import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateBookingAdmin, updateUserAdmin, listBlackouts } from "../api/admin";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import AdminBookingPrint from "./AdminBookingPrint";
import { createRoot } from "react-dom/client";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toDateOnlyFromAPIUTC, todayDateOnlyUTC } from "../lib/date";

const GOV_ID_TYPES = ["Aadhaar", "Passport", "Voter ID", "Driving License"];
const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);


const toYMD = (d) => {
  if (!d) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


export default function EditBookingDialog({ open, onOpenChange, booking, reload }) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    govIdType: "",
    govIdNumber: "",
    amountPaid: "",
    paymentMode: "Cash",
    startDate: null,
    endDate: null,
  });

  const [disabledDates, setDisabledDates] = useState(() => [
    { before: todayDateOnlyUTC() },
  ]);

  useEffect(() => {
    if (!booking) return;

    setForm({
      fullName:
        booking?.adminMeta?.fullName ||
        booking?.contactName ||
        booking?.user?.name ||
        "",
      phone:
        booking?.adminMeta?.phone ||
        booking?.contactPhone ||
        booking?.user?.phone ||
        "",
      govIdType: booking?.adminMeta?.govIdType || "",
      govIdNumber: booking?.adminMeta?.govIdNumber || "",
      amountPaid:
        booking?.adminMeta?.amountPaid != null
          ? String(booking.adminMeta.amountPaid)
          : booking?.amount != null
            ? String(booking.amount)
            : "",
      paymentMode: booking?.adminMeta?.paymentMode || "Cash",
      startDate: booking?.startDate ? new Date(booking.startDate) : null,
      endDate: booking?.endDate ? new Date(booking.endDate) : null,
    });
  }, [booking, open]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const blk = await listBlackouts();

        let res = await fetch(`${API_ROOT}/rooms/disabled/all`, {
          credentials: "include",
        });
        if (!res.ok) {
          res = await fetch(`${API_ROOT}/rooms/blocked/all`, {
            credentials: "include",
          });
        }
        const bookedJson = res.ok ? await res.json() : [];

        const bookedRanges = (bookedJson || []).map((r) => ({
          from: toDateOnlyFromAPIUTC(r.from || r.startDate),
          to: toDateOnlyFromAPIUTC(r.to || r.endDate),
        }));

        const blackoutRanges = (blk || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from),
          to: toDateOnlyFromAPIUTC(b.to),
        }));

        setDisabledDates([
          { before: todayDateOnlyUTC() },
          ...bookedRanges,
          ...blackoutRanges,
        ]);
      } catch (err) {
        console.error("Failed to build disabled ranges for edit dialog:", err);
      }
    })();
  }, [open]);

  if (!booking) return null;

  const handleSave = async () => {
    try {
      if (!form.startDate || !form.endDate) {
        toast.error("Please select check-in and check-out dates");
        return;
      }

      if (form.endDate <= form.startDate) {
        toast.error("Check-out date must be after check-in date");
        return;
      }

      setSaving(true);

      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        govIdType: form.govIdType,
        govIdNumber: form.govIdNumber,
        amountPaid: form.amountPaid ? Number(form.amountPaid) : null,
        paymentMode: form.paymentMode,
        startDate: toYMD(form.startDate),
        endDate: toYMD(form.endDate),
        amount: form.amountPaid ? Number(form.amountPaid) : booking.amount,
      };

      await updateBookingAdmin(booking._id, payload);

      if (booking.user?._id) {
        await updateUserAdmin(booking.user._id, {
          name: form.fullName,
          phone: form.phone,
        });
      }

      toast.success("Booking updated");
      reload?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(<AdminBookingPrint booking={booking} adminMeta={form} />);

    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(container.firstChild, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`booking_${booking._id}.pdf`);

    root.unmount();
    document.body.removeChild(container);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">

        {/* ===== HEADER ===== */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit Booking</h2>
          <p className="text-xs text-muted-foreground">
            Booking ID: #{booking._id.slice(-6)}
          </p>
        </div>

        {/* ===== BODY ===== */}
        <div className="px-6 py-2 space-y-6 text-sm">

          {/* Dates */}
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium">
              CHECK-IN – CHECK-OUT
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* Check-in */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    {form.startDate
                      ? format(form.startDate, "dd MMM yyyy")
                      : "Check-in"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    selected={form.startDate}
                    onSelect={(d) => setForm(f => ({ ...f, startDate: d }))}
                    disabled={disabledDates}
                  />
                </PopoverContent>
              </Popover>

              {/* Check-out */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    {form.endDate
                      ? format(form.endDate, "dd MMM yyyy")
                      : "Check-out"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    selected={form.endDate}
                    onSelect={(d) => setForm(f => ({ ...f, endDate: d }))}
                    disabled={disabledDates}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Guest Info */}
          <div className="space-y-3">
            <Field label="Full Name">
              <Input value={form.fullName}
                onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </Field>

            <Field label="Phone">
              <Input value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Govt ID Type">
                <Select value={form.govIdType}
                  onValueChange={(v) => setForm(f => ({ ...f, govIdType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select ID" /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {GOV_ID_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Govt ID Number">
                <Input value={form.govIdNumber}
                  onChange={(e) => setForm(f => ({ ...f, govIdNumber: e.target.value }))} />
              </Field>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount Paid (₹)">
              <Input type="number" value={form.amountPaid}
                onChange={(e) => setForm(f => ({ ...f, amountPaid: e.target.value }))} />
            </Field>

            <Field label="Payment Mode">
              <Select value={form.paymentMode}
                onValueChange={(v) => setForm(f => ({ ...f, paymentMode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>

  );
}
