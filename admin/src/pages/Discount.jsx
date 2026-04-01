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
  const [twoNightPercent, setTwoNightPercent] = useState(15);
  const [threeNightPercent, setThreeNightPercent] = useState(20);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAdminDiscount();
        setEnabled(Boolean(data.weekendDiscountEnabled));
        setTwoNightPercent(Number(data.twoWeekendNightsDiscountPercent || 0));
        setThreeNightPercent(
          Number(data.threeWeekendNightsDiscountPercent || 0)
        );
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
        twoWeekendNightsDiscountPercent: Number(twoNightPercent || 0),
        threeWeekendNightsDiscountPercent: Number(threeNightPercent || 0),
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
            Configure tiered discounts for 2 and 3 weekend nights.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Weekend Offer</h2>
              <p className="text-sm text-muted-foreground">
                Apply one discount for any 2 weekend nights and a higher
                discount for Friday, Saturday, and Sunday together.
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="discount-two-night-percent">
                2 Weekend Nights Discount
              </Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="discount-two-night-percent"
                  type="number"
                  min={0}
                  max={100}
                  value={twoNightPercent}
                  disabled={loading || !enabled}
                  onChange={(e) => setTwoNightPercent(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Example: Fri+Sat or Sat+Sun = 15%
              </p>
            </div>

            <div className="max-w-xs space-y-2">
              <Label htmlFor="discount-three-night-percent">
                3 Weekend Nights Discount
              </Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="discount-three-night-percent"
                  type="number"
                  min={0}
                  max={100}
                  value={threeNightPercent}
                  disabled={loading || !enabled}
                  onChange={(e) => setThreeNightPercent(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Example: Fri+Sat+Sun = 20%
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            Weekend nights are Friday, Saturday, and Sunday nights.
            Any 2 weekend nights get the first discount. All 3 weekend nights
            get the higher discount.
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
