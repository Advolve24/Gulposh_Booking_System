import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cancelBookingAdmin } from "@/api/admin";

const reasons = [
  "Change of travel plans",
  "Found alternative accommodation",
  "Personal / family emergency",
  "Weather / safety concerns",
  "Other",
];

const daysBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0,0,0,0);
  b.setHours(0,0,0,0);
  return Math.ceil((b - a) / 86400000);
};

const refundPolicy = (days) => {
  if (days >= 14) return 100;
  if (days >= 7) return 50;
  return 0;
};

const daysBetweenDates = (from, to) => {
  const d1 = new Date(from);
  const d2 = new Date(to);

  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  return Math.ceil((d2 - d1) / 86400000);
};


export default function AdminCancelBookingDialog({
  open,
  booking,
  onClose,
  onSuccess,
}) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const daysBefore = useMemo(() => {
    if (!booking) return 0;
    return daysBetween(new Date(), booking.startDate);
  }, [booking]);

  const refundPercent = refundPolicy(daysBefore);
  const refundAmount = Math.round(
    ((booking?.amount || 0) * refundPercent) / 100
  );

  if (!booking) return null;

  /* ================= FINAL CANCEL ================= */
  const handleCancel = async () => {
    if (!agree || !reason) return;

    setLoading(true);
    try {
      await cancelBookingAdmin(booking._id, {
        reason: notes ? `${reason} — ${notes}` : reason,
      });

      toast.success("Booking cancelled successfully");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to cancel booking"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] p-0 rounded-2xl overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Cancel Booking</h2>
        </div>

        {/* STEPS */}
        <div className="flex justify-center gap-2 py-3">
          {[1,2,3,4].map(i => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                step === i ? "bg-red-500" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        <div className="px-5 pb-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* STEP 1 — SUMMARY */}
          {step === 1 && (
            <>
              <div className="border rounded-xl p-3 space-y-2">
                <div className="font-medium">{booking.room?.name}</div>
                <div className="text-xs text-muted-foreground">
                  Ref: {booking._id.slice(-6)}
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span>Check-in</span>
                  <span>{format(new Date(booking.startDate), "EEE, dd MMM yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Check-out</span>
                  <span>{format(new Date(booking.endDate), "EEE, dd MMM yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Paid</span>
                  <span className="font-medium">₹{booking.amount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <Button className="w-full bg-red-600" onClick={() => setStep(2)}>
                Continue
              </Button>
            </>
          )}

          {/* STEP 2 — REASON */}
          {step === 2 && (
            <>
              <h3 className="font-medium">Why are you cancelling?</h3>
              <div className="space-y-2">
                {reasons.map(r => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`w-full border rounded-lg px-3 py-2 text-left ${
                      reason === r ? "border-red-500" : ""
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Additional notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />

              <div className="flex gap-2">
                <Button variant="outline" className="w-1/2" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="w-1/2 bg-red-600"
                  disabled={!reason}
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {/* STEP 3 — REFUND */}
          {step === 3 && (
            <>
              <div className="border rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Paid</span>
                  <span>₹{booking.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Cancellation Fee</span>
                  <span>₹{booking.amount - refundAmount}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Refund Amount</span>
                  <span className="text-green-600">₹{refundAmount}</span>
                </div>
              </div>

              <div className="text-xs bg-green-50 text-green-700 p-2 rounded-lg">
                You’ll receive {refundPercent}% refund within 5–7 business days
              </div>

              <Button className="w-full bg-red-600" onClick={() => setStep(4)}>
                Continue
              </Button>
            </>
          )}

          {/* STEP 4 — CONFIRM */}
          {step === 4 && (
            <>
              <div className="border border-red-200 bg-red-50 p-3 rounded-lg text-sm">
                <strong>Are you sure?</strong>
                <div>This action cannot be undone.</div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox checked={agree} onCheckedChange={setAgree} />
                <span className="text-xs">
                  I understand and agree to the cancellation policy
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="w-1/2" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button
                  className="w-1/2 bg-red-600"
                  disabled={!agree || loading}
                  onClick={handleCancel}
                >
                  Confirm Cancellation
                </Button>
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
