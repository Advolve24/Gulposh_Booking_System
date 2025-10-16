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
import { updateBookingAdmin, updateUserAdmin } from "../api/admin";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import AdminBookingPrint from "./AdminBookingPrint";
import { createRoot } from "react-dom/client";


const GOV_ID_TYPES = ["Aadhaar", "Passport", "Voter ID", "Driving License"];

export default function EditBookingDialog({ open, onOpenChange, booking, reload }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    govIdType: "",
    govIdNumber: "",
    amountPaid: "",
    paymentMode: "Cash",
  });

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
    });
  }, [booking, open]);

  if (!booking) return null;

  const handleSave = async () => {
  try {
    setSaving(true);

    const payload = {
      ...form,
      amountPaid: form.amountPaid === "" ? null : Number(form.amountPaid),
    };

    // update booking
    await updateBookingAdmin(booking._id, payload);

    // update user details if name or phone changed
    if (booking.user?._id) {
      await updateUserAdmin(booking.user._id, {
        name: form.fullName,
        phone: form.phone,
      });
    }

    toast.success("Booking & User updated");
    reload?.();
    onOpenChange(false);
  } catch (e) {
    toast.error(e?.response?.data?.message || "Update failed");
  } finally {
    setSaving(false);
  }
};

 const handlePrint = async () => {
  // Create a temporary container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  document.body.appendChild(container);

  // Render our JSX template into it
  const root = createRoot(container);
  root.render(<AdminBookingPrint booking={booking} form={form} />);

  // Wait for rendering
  await new Promise((r) => setTimeout(r, 300));

  // Capture as canvas
  const canvas = await html2canvas(container.firstChild, {
    scale: 2,
    useCORS: true,
    scrollY: -window.scrollY,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "pt", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`booking_${booking._id}.pdf`);

  // Cleanup
  root.unmount();
  document.body.removeChild(container);
};



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl"> {/* Increased width */}
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <Label>Full Name</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>

          {/* Phone */}
          <div>
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          {/* Gov ID Type */}
          <div>
            <Label>Government ID Type</Label>
            <Select
              value={form.govIdType}
              onValueChange={(v) => setForm((f) => ({ ...f, govIdType: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ID" />
              </SelectTrigger>
              <SelectContent>
                {GOV_ID_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gov ID Number */}
          <div>
            <Label>Government ID Number</Label>
            <Input
              value={form.govIdNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, govIdNumber: e.target.value }))
              }
            />
          </div>

          {/* Check-in */}
          <div>
            <Label>Check-in</Label>
            <Input
              value={new Date(booking.startDate).toLocaleDateString()}
              disabled
            />
          </div>

          {/* Check-out */}
          <div>
            <Label>Check-out</Label>
            <Input
              value={new Date(booking.endDate).toLocaleDateString()}
              disabled
            />
          </div>

          {/* Guests */}
          <div>
            <Label>Guests</Label>
            <Input value={String(booking.guests ?? "")} disabled />
          </div>

          {/* Room Assigned */}
          <div>
            <Label>Room Assigned</Label>
            <Input value={booking.room?.name || "Entire Villa"} disabled />
          </div>

          {/* Amount Paid */}
          <div>
            <Label>Amount Paid (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.amountPaid}
              onChange={(e) =>
                setForm((f) => ({ ...f, amountPaid: e.target.value }))
              }
              disabled
            />
          </div>

          {/* Payment Mode */}
          <div>
            <Label>Payment Mode</Label>
            <Select
              value={form.paymentMode}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, paymentMode: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={handlePrint}>
            Print PDF
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
