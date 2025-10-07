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
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // === LOGO ===
  const logoUrl =
    "https://res.cloudinary.com/dmbpfgpt4/image/upload/v1759811127/Group_18_2_k0qxpv.png";

  // Load logo preserving aspect ratio
  const loadImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
    });

  const logoBase64 = await loadImage(logoUrl);

  // === HEADER BAR ===
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, 210, 30, "F");

  // Logo (kept full, not squished)
  doc.addImage(logoBase64, "PNG", 14, 5, 55, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text("Villa Gulposh", 200, 12, { align: "right" });
  doc.text("www.villagulposh.com", 200, 17, { align: "right" });
  doc.text("stay@villagulposh.com", 200, 22, { align: "right" });

  // === COMMON UTIL ===
  const addLine = (label, value) => {
  const startX = 18;
  const valueX = 80;

  // Draw label normally (no kerning distortion)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${label}:`, startX, y);

  // Draw value aligned beside it
  doc.setFont("helvetica", "normal");
  doc.text(String(value || "—"), valueX, y);
  y += 8;
};

  // === SECTION 1: Guest Details ===
  let y = 55;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("Guest Details", 14, y);
  y += 5;
  doc.setDrawColor(180);
  doc.line(14, y, 196, y);
  y += 8;

  addLine("Full Name", form.fullName);
  addLine("Phone Number", form.phone);
  addLine("Government ID Type", form.govIdType || "—");
  addLine("Government ID Number", form.govIdNumber || "—");

  // === SECTION 2: Stay Details ===
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Stay Details", 14, y);
  y += 5;
  doc.line(14, y, 196, y);
  y += 8;

  addLine("Check-in Date", new Date(booking.startDate).toLocaleDateString());
  addLine("Check-out Date", new Date(booking.endDate).toLocaleDateString());
  addLine("Number of Guests", booking.guests ?? "—");
  addLine("Room Assigned", booking.room?.name || "—");

  // === SECTION 3: Payment Information ===
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Payment Information", 14, y);
  y += 5;
  doc.line(14, y, 196, y);
  y += 8;

  addLine("Amount Paid", form.amountPaid ? `Rs. ${form.amountPaid}` : "—");

  addLine("Payment Mode", form.paymentMode || "—");

  // === SECTION 4: Guest Consent ===
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Guest Consent", 14, y);
  y += 5;
  doc.line(14, y, 196, y);
  y += 10;

  // Checkbox outline
  doc.setDrawColor(0);
  doc.rect(18, y - 4, 5, 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("I confirm the above details are true and correct.", 26, y);
  y += 15;

  doc.text("Guest Signature: ____________________________", 18, y);
  y += 25;

  // === FOOTER ===
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("We hope you had a pleasant stay!", 14, y);
  y += 5;
  doc.text("For any support, contact us at stay@villagulposh.com", 14, y);

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("Generated on " + new Date().toLocaleString(), 14, 285);

  // === SAVE ===
  doc.save(`booking_${booking._id}.pdf`);
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
            <Input value={booking.room?.name || "—"} disabled />
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
