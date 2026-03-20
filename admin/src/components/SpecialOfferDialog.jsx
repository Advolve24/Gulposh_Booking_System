import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Gift, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { createSpecialOffer, getSpecialOfferByUser } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (date) => {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy");
};

export default function SpecialOfferDialog({
  open,
  onOpenChange,
  guest,
  occasionType = "manual",
  dateKey = "birthday",
}) {
  const [discountPercent, setDiscountPercent] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingOffer, setLoadingOffer] = useState(false);

  useEffect(() => {
    if (!open || !guest) return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingOffer(true);
        const existingOffer = await getSpecialOfferByUser(guest._id);

        if (cancelled) return;

        if (existingOffer) {
          setDiscountPercent(String(existingOffer.discountPercent || ""));
          setMessage(
            existingOffer.message ||
              `Hello ${guest.name || "Guest"}, we would like to share a special offer with you from Villa Gulposh.`
          );
        } else {
          setDiscountPercent("");
          setMessage(
            `Hello ${guest.name || "Guest"}, we would like to share a special offer with you from Villa Gulposh.`
          );
        }
      } catch {
        if (!cancelled) {
          setDiscountPercent("");
          setMessage(
            `Hello ${guest.name || "Guest"}, we would like to share a special offer with you from Villa Gulposh.`
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOffer(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, guest]);

  const whatsappUrl = useMemo(() => {
    if (!guest?.phone) return "";
    const cleaned = String(guest.phone).replace(/\D/g, "");
    const phone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    const text = encodeURIComponent(
      `${message}${discountPercent ? `\nOffer: ${discountPercent}% discount` : ""}`
    );
    return `https://wa.me/${phone}?text=${text}`;
  }, [discountPercent, guest, message]);

  const applyOffer = async () => {
    if (!guest?._id) return;

    const parsedPercent = Number(discountPercent);
    if (!Number.isFinite(parsedPercent) || parsedPercent <= 0 || parsedPercent > 100) {
      toast.error("Enter a valid discount percentage");
      return;
    }

    try {
      setSaving(true);
      await createSpecialOffer({
        userId: guest._id,
        discountPercent: parsedPercent,
        message,
        occasionType,
        occasionDate: guest?.[dateKey] || null,
      });
      toast.success("Offer applied for this user");
    } catch {
      toast.error("Failed to apply offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Special Offer</DialogTitle>
          <DialogDescription>
            This offer will apply only for this guest account.
          </DialogDescription>
        </DialogHeader>

        {guest && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Info label="Name" value={guest.name || "-"} />
              <Info label="Email" value={guest.email || "-"} />
              <Info label="Phone" value={guest.phone || "-"} />
              <Info
                label={dateKey === "anniversary" ? "Anniversary" : "Birth Date"}
                value={fmt(guest?.[dateKey])}
              />
            </div>

            <div className="space-y-2">
              <Label>Discount Percentage</Label>
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="Enter discount %"
                value={discountPercent}
                disabled={loadingOffer}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Offer Description</Label>
              <textarea
                rows={4}
                value={message}
                disabled={loadingOffer}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={applyOffer} disabled={saving || loadingOffer}>
                <Gift size={14} className="mr-2" />
                {saving ? "Applying..." : "Apply"}
              </Button>

              <Button
                variant="outline"
                disabled={!whatsappUrl || loadingOffer}
                onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
              >
                <MessageCircle size={14} className="mr-2" />
                Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  );
}
