import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
import { addDays } from "date-fns";
import { listBookingsAdmin } from "../api/admin";


const toDateKey = (date) => format(date, "yyyy-MM-dd");

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

const rangeHasDisabled = (from, to, disabledRanges) => {
  return disabledRanges.some(r => {
    if (!r.from || !r.to) return false;

    return (
      from < r.to &&
      to > r.from
    );
  });
};

const rangeContainsDisabledDates = (from, to, bookedDates, blackoutDates) => {
  let d = toDateKey(from);
  const endKey = toDateKey(to);

  while (d <= endKey) {
    if (bookedDates.has(d) || blackoutDates.has(d)) {
      return true;
    }
    d = toDateKey(addDays(new Date(d), 1));
  }

  return false;
};




const ReadOnlyField = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-sm font-medium text-foreground">
      {value || "—"}
    </p>
  </div>
);


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

  const [overlapRanges, setOverlapRanges] = useState([]);
  const [bookedDates, setBookedDates] = useState(new Set());
  const [blackoutDates, setBlackoutDates] = useState(new Set());


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
        const [blk, bookings] = await Promise.all([
          listBlackouts(),
          listBookingsAdmin({ limit: 500 }),
        ]);

        const currentFrom = toDateKey(new Date(booking.startDate));
        const currentTo = toDateKey(new Date(booking.endDate));

        const bookedSet = new Set();
        const blackoutSet = new Set();

        // REAL BOOKINGS
        bookings.forEach(b => {
          const fromKey = toDateKey(new Date(b.startDate));
          const toKey = toDateKey(new Date(b.endDate));
          let d = fromKey;
          while (d <= toKey) {
            bookedSet.add(d);
            d = toDateKey(addDays(new Date(d), 1));
          }
        });

        // BLACKOUTS
        (blk || []).forEach(b => {
          let d = toDateKey(new Date(b.from));
          const end = toDateKey(new Date(b.to));

          while (d <= end) {
            blackoutSet.add(d);
            d = toDateKey(addDays(new Date(d), 1));
          }
        });

        setBookedDates(bookedSet);
        setBlackoutDates(blackoutSet);

      } catch (err) {
        console.error(err);
      }
    })();
  }, [open]);



  if (!booking) return null;

  const lockedNights = Math.max(
    1,
    Math.round(
      (new Date(booking.endDate) - new Date(booking.startDate)) / 86400000
    )
  );

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
      <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden">

        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit Booking</h2>
          <p className="text-xs text-muted-foreground">
            Booking ID: #{booking._id.slice(-6)}
          </p>
        </div>

        <div className="px-6 py-2 space-y-6 text-sm">

          {/* Dates */}
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium">
              CHECK-IN – CHECK-OUT
            </span>

            <div className="grid grid-cols-1 gap-3">
              {/* Check-in */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start h-12 text-[16px] w-full">
                    {form.startDate && form.endDate
                      ? `${format(form.startDate, "dd MMM yyyy")} – ${format(form.endDate, "dd MMM yyyy")}`
                      : "Select date range"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    className="w-[380px]"
                    selected={form.startDate}
                    disabled={(date) => {
                      const key = toDateKey(date);
                      const todayKey = toDateKey(new Date());

                      return (
                        key < todayKey ||
                        bookedDates.has(key) ||
                        blackoutDates.has(key)
                      );
                    }}

                    onSelect={(d) => {
                      if (!d) return;

                      const autoEnd = new Date(d);
                      autoEnd.setDate(autoEnd.getDate() + lockedNights);

                      if (rangeContainsDisabledDates(d, autoEnd, bookedDates, blackoutDates)) {
                        toast.error(
                          "You are selecting a date range which contains booked/blocked dates. Please select different dates."
                        );
                        return;
                      }

                      setForm(f => ({
                        ...f,
                        startDate: d,
                        endDate: autoEnd,
                      }));
                    }}
                  />

                </PopoverContent>
              </Popover>


              {/* Check-out
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
                    disabled={calendarDisabled}
                  />
                </PopoverContent>
              </Popover> */}
            </div>
          </div>

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

          {/* Guest Info */}
          <div className="flex justify-between">
            <ReadOnlyField label="Full Name" value={form.fullName} />
            <ReadOnlyField label="Phone" value={form.phone} />
            <ReadOnlyField label="Email" value={booking.user?.email} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ReadOnlyField
              label="Room"
              value={
                booking.isVilla
                  ? "Entire Villa"
                  : booking.room?.name
              }
            />

            <ReadOnlyField
              label="Nights"
              value={`${lockedNights} nights`}
            />

            <ReadOnlyField
              label="Total Guests"
              value={`${(booking.adults || 0) + (booking.children || 0)} (Adults ${booking.adults || 0}, Children ${booking.children || 0})`}
            />

            <ReadOnlyField
              label="Veg Guests"
              value={booking.vegGuests || 0}
            />

            <ReadOnlyField
              label="Non-Veg Guests"
              value={booking.nonVegGuests || 0}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ReadOnlyField
              label="Amount Paid"
              value={`₹${booking.adminMeta?.amountPaid || booking.amount}`}
            />

            <ReadOnlyField
              label="Payment Mode"
              value={booking.adminMeta?.paymentMode || "—"}
            />
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
    </Dialog >

  );
}
