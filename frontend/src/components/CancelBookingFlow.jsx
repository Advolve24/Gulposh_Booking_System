import { useEffect, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { X, AlertTriangle, Clock } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
} from "@/components/ui/dialog";

import {
    Drawer,
    DrawerContent,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { getBooking, cancelBooking } from "@/api/bookings";
import { useMediaQuery } from "@/hooks/use-media-query";

/* ---------------------------------------------
   CONFIG
--------------------------------------------- */
const STEPS = ["summary", "reason", "refund", "confirm"];

const CANCEL_REASONS = [
    "Change of travel plans",
    "Found alternative accommodation",
    "Personal / family emergency",
    "Weather / safety concerns",
    "Other",
];

/* ---------------------------------------------
   MAIN COMPONENT
--------------------------------------------- */
export default function CancelBookingFlow({
    bookingId,
    open,
    onOpenChange,
    onSuccess,
}) {
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const [step, setStep] = useState(0);
    const [booking, setBooking] = useState(null);
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [agree, setAgree] = useState(false);
    const [loading, setLoading] = useState(false);
    const room = booking?.room ;

    /* FETCH BOOKING */
    useEffect(() => {
        if (!open) return;
        getBooking(bookingId).then(setBooking);
        setStep(0);
        setReason("");
        setNotes("");
        setAgree(false);
    }, [open, bookingId]);

    if (!booking) return null;

    const daysBeforeCheckin = differenceInCalendarDays(
        new Date(booking.startDate),
        new Date()
    );

    const refundPercent =
        daysBeforeCheckin >= 14 ? 100 :
            daysBeforeCheckin >= 7 ? 50 : 0;

    const refundAmount =
        Math.round((booking.amount * refundPercent) / 100);

    /* FINAL CANCEL */
    const handleCancel = async () => {
        if (!agree) return;
        setLoading(true);
        try {
            await cancelBooking(bookingId);
            onOpenChange(false);
            onSuccess?.();
        } finally {
            setLoading(false);
        }
    };

    const Container = isDesktop ? Dialog : Drawer;
    const Content = isDesktop ? DialogContent : DrawerContent;

    const roomImage =
    room?.images?.length > 0
      ? room.images[0]
      : room?.image || room?.coverImage || null;


    return (
        <Container open={open} onOpenChange={onOpenChange}>
            <Content
                className="
          max-w-md w-full
          p-0
          flex flex-col
          max-h-[90vh]
        "
            >
                {/* ================= HEADER ================= */}
                <DialogHeader className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Cancel Booking</h3>
                    <button onClick={() => onOpenChange(false)}>
                    </button>
                </DialogHeader>

                {/* ================= STEPS ================= */}
                <div className="flex justify-center gap-2 py-3 border-b">
                    {STEPS.map((_, i) => (
                        <span
                            key={i}
                            className={`h-2 w-2 rounded-full ${i === step ? "bg-red-600" : "bg-muted"
                                }`}
                        />
                    ))}
                </div>

                {/* ================= SCROLLABLE BODY ================= */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">

                    {/* STEP 1 */}
                    {step === 0 && (
                        <>
                            {/* ROOM CARD */}
                            <div className="flex gap-3 rounded-xl border p-3 items-center">
                                {roomImage && (
                                    <img
                                        src={roomImage}
                                        alt={booking.room?.name}
                                        className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                                    />
                                )}

                                <div className="flex-1">
                                    <div className="text-[15px] font-semibold leading-tight">
                                        {booking.room?.name}
                                    </div>

                                    {booking.room?.category && (
                                        <div className="text-sm text-muted-foreground">
                                            {booking.room.category}
                                        </div>
                                    )}

                                    <div className="text-xs text-muted-foreground mt-1">
                                        Ref: {booking._id.slice(-8).toUpperCase()}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* DETAILS */}
                            <InfoRow label="Check-in">
                                {format(new Date(booking.startDate), "EEE, MMM d yyyy")}
                            </InfoRow>

                            <InfoRow label="Check-out">
                                {format(new Date(booking.endDate), "EEE, MMM d yyyy")}
                            </InfoRow>

                            <InfoRow label="Guests">
                                {booking.guests} Guests
                            </InfoRow>

                            <InfoRow label="Total Paid">
                                ₹{booking.amount.toLocaleString("en-IN")}
                            </InfoRow>

                        </>
                    )}

                    {/* STEP 2 */}
                    {step === 1 && (
                        <>
                            <p className="font-medium">
                                Why are you cancelling this booking?
                            </p>

                            <RadioGroup value={reason} onValueChange={setReason}>
                                {CANCEL_REASONS.map((r) => (
                                    <label
                                        key={r}
                                        className="flex items-center gap-3 border rounded-lg p-3"
                                    >
                                        <RadioGroupItem value={r} />
                                        {r}
                                    </label>
                                ))}
                            </RadioGroup>

                            <textarea
                                className="w-full border rounded-lg p-3 text-sm"
                                placeholder="Additional notes (optional)"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </>
                    )}

                    {/* STEP 3 */}
                    {step === 2 && (
                        <>
                            <div className="rounded-xl border bg-white p-4 space-y-3">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    {daysBeforeCheckin} days until check-in
                                </div>

                                <Separator />

                                <InfoRow label="Total Paid">
                                    ₹{booking.amount.toLocaleString("en-IN")}
                                </InfoRow>

                                <InfoRow label="Cancellation Fee">
                                    <span className="text-red-600">
                                        - ₹{(booking.amount - refundAmount).toLocaleString("en-IN")}
                                    </span>
                                </InfoRow>

                                <Separator />

                                <InfoRow label="Refund Amount">
                                    <span className="text-green-600 font-semibold">
                                        ₹{refundAmount.toLocaleString("en-IN")}
                                    </span>
                                </InfoRow>
                            </div>

                            <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm">
                                ✔ You’ll receive {refundPercent}% refund within 5–7 business days
                            </div>

                            <PolicyRow
                                label="14+ days before check-in"
                                value="100% refund"
                                active={refundPercent === 100}
                                color="green"
                            />
                            <PolicyRow
                                label="7–13 days before check-in"
                                value="50% refund"
                                active={refundPercent === 50}
                                color="yellow"
                            />
                            <PolicyRow
                                label="Less than 7 days before check-in"
                                value="0% refund"
                                active={refundPercent === 0}
                                color="red"
                            />
                        </>
                    )}

                    {/* STEP 4 */}
                    {step === 3 && (
                        <>
                            <div className="flex gap-2 bg-red-50 p-3 rounded-lg text-red-700">
                                <AlertTriangle className="w-4 h-4 mt-0.5" />
                                This action cannot be undone.
                            </div>

                            <InfoRow label="Refund Amount">
                                ₹{refundAmount.toLocaleString("en-IN")}
                            </InfoRow>

                            <label className="flex items-start gap-3 text-xs">
                                <Checkbox checked={agree} onCheckedChange={setAgree} />
                                I understand and agree to the cancellation policy.
                            </label>
                        </>
                    )}
                </div>

                {/* ================= STICKY FOOTER ================= */}
                <div className="p-4 border-t bg-white flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep(step - 1)}
                        disabled={step === 0}
                    >
                        Back
                    </Button>

                    <Button
                        className="flex-1"
                        disabled={
                            loading ||
                            (step === 1 && !reason) ||
                            (step === 3 && !agree)
                        }
                        onClick={step === 3 ? handleCancel : () => setStep(step + 1)}
                    >
                        {step === 3 ? "Confirm Cancellation" : "Continue"}
                    </Button>
                </div>
            </Content>
        </Container>
    );
}

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */
function InfoRow({ label, children }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{children}</span>
        </div>
    );
}

function PolicyRow({ label, value, active, color }) {
    const colors = {
        green: "border-green-500 text-green-600",
        yellow: "border-yellow-400 text-yellow-600",
        red: "border-red-500 text-red-600",
    };

    return (
        <div
            className={`flex justify-between items-center border rounded-lg px-3 py-2 text-sm
        ${active ? colors[color] : "border-muted text-muted-foreground"}
      `}
        >
            <span>{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}
