import { useEffect, useState } from "react";
import { Percent, Save } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { getAdminDiscount, updateAdminDiscount } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default function Discount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [percent, setPercent] = useState(20);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAdminDiscount();
        setEnabled(Boolean(data.weekendDiscountEnabled));
        setPercent(Number(data.weekendDiscountPercent || 0));
      } catch {
        toast.error("Failed to load discount settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveDiscount = async () => {
    try {
      setSaving(true);
      await updateAdminDiscount({
        weekendDiscountEnabled: enabled,
        weekendDiscountPercent: Number(percent || 0),
      });
      toast.success("Discount settings updated");
    } catch {
      toast.error("Failed to save discount settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl px-2 sm:px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Discount</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the Friday to Sunday upsell discount shown during booking.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Weekend Offer</h2>
              <p className="text-sm text-muted-foreground">
                If a guest starts a booking on Friday and adds Sunday night
                as well, this discount is applied to the booking subtotal.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="weekend-discount-toggle" className="text-sm">
                {enabled ? "Yes" : "No"}
              </Label>
              <Switch
                id="weekend-discount-toggle"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={loading}
              />
            </div>
          </div>

          <Separator />

          <div className="max-w-xs space-y-2">
            <Label htmlFor="discount-percent">Discount Percentage</Label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="discount-percent"
                type="number"
                min={0}
                max={100}
                value={percent}
                disabled={loading || !enabled}
                onChange={(e) => setPercent(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Example: 10, 15, 20
            </p>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            Applied when check-in is Friday and checkout is Monday or later,
            which means the guest added Sunday night to the booking.
          </div>

          <div className="flex justify-end">
            <Button onClick={saveDiscount} disabled={loading || saving}>
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : "Save Discount"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
