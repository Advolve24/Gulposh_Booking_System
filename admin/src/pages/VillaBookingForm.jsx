import { useEffect, useState } from "react";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { loadRazorpayScript } from "../lib/loadRazorpay";
import { toDateOnlyUTC, todayDateOnlyUTC, toDateOnlyFromAPIUTC } from "../lib/date";
import { useNavigate } from "react-router-dom";

export default function VillaBookingForm() {
  const [range, setRange] = useState();
  const [disabled, setDisabled] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    guests: 1,
    customAmount: "",
    govIdType: "",
    govIdNumber: "",
    paymentMode: "Online",
  });

  // ✅ Fetch disabled booking ranges
  useEffect(() => {
    (async () => {
      try {
        const [booked, blackouts] = await Promise.all([
          api.get("/rooms/disabled/all"),
          api.get("/blackouts"),
        ]);
        const bookedRanges = (booked.data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: toDateOnlyFromAPIUTC(b.to || b.endDate),
        }));
        const blkRanges = (blackouts.data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from),
          to: toDateOnlyFromAPIUTC(b.to),
        }));
        setDisabled([...bookedRanges, ...blkRanges]);
      } catch (e) {
        console.error("failed to load villa disabled ranges", e);
      }
    })();
  }, []);

  // ✅ Input validations
  const validateForm = () => {
    if (!form.name.trim() || form.name.length < 3)
      throw new Error("Please enter a valid name (min 3 characters)");
    if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(form.email))
      throw new Error("Please enter a valid email address");
    if (!/^[6-9]\d{9}$/.test(form.phone))
      throw new Error("Enter valid 10-digit Indian phone number");
    if (form.password.length < 6)
      throw new Error("Password must be at least 6 characters long");
    if (!form.customAmount || form.customAmount <= 0)
      throw new Error("Enter valid custom amount");
    if (!range?.from || !range?.to)
      throw new Error("Please select check-in and check-out dates");
  };

  async function ensureUserExists() {
    const { name, email, phone, password } = form;
    try {
      await api.post("/auth/register", { name, email, phone, password });
    } catch (e) {
      const msg = e?.response?.data?.message || "";
      if (/already/i.test(msg)) {
        toast.info("User already exists, proceeding...");
        return;
      }
      throw e;
    }
  }

  const submit = async () => {
    try {
      setLoading(true);
      validateForm();
      await ensureUserExists();

      const start = toDateOnlyUTC(range?.from);
      const end = toDateOnlyUTC(range?.to);

      // ✅ Cash booking (direct confirm)
      if (form.paymentMode === "Cash") {
        await api.post("/admin/villa-verify", {
          startDate: start,
          endDate: end,
          guests: form.guests,
          customAmount: form.customAmount,
          contactName: form.name,
          contactEmail: form.email,
          contactPhone: form.phone,
          govIdType: form.govIdType,
          govIdNumber: form.govIdNumber,
          paymentMode: "Cash",
        });
        toast.success("Villa booked successfully (Cash)");
        return navigate("/dashboard");
      }

      // ✅ Online booking (Razorpay)
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Razorpay script failed to load");

      const { data: order } = await api.post("/admin/villa-order", {
        startDate: start,
        endDate: end,
        guests: form.guests,
        customAmount: form.customAmount,
        contactName: form.name,
        contactEmail: form.email,
        contactPhone: form.phone,
      });

      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "Villa Gulposh",
        description: "Entire Villa Booking",
        order_id: order.orderId,
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        handler: async (resp) => {
          try {
            await api.post("/admin/villa-verify", {
              userId: selectedUserId, 
              startDate: start,
              endDate: end,
              guests: form.guests,
              customAmount: form.customAmount,
              contactName: form.name,
              contactEmail: form.email,
              contactPhone: form.phone,
              govIdType: form.govIdType,
              govIdNumber: form.govIdNumber,
              paymentMode: form.paymentMode,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success("Booking confirmed successfully!");
            navigate("/dashboard");
          } catch (err) {
            toast.error(err?.response?.data?.message || "Payment verification failed");
          }
        },
        modal: { ondismiss: () => toast("Payment cancelled") },
      });

      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Could not process booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-md rounded-2xl p-8 mt-6 mb-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Book Entire Villa</h2>

      <div className="flex flex-wrap justify-between gap-8">
        {/* Calendar */}
        <div className="w-full md:w-[35%]">
          <Label className="mb-2 block text-gray-600">Select Dates</Label>
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            disabled={[{ before: todayDateOnlyUTC() }, ...disabled]}
            numberOfMonths={1}
            className="border rounded-lg shadow-sm w-[400px]"
          />
        </div>

        {/* Form */}
        <div className="w-full md:w-[58%] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Guests</Label>
              <Input
                type="number"
                min="1"
                value={form.guests}
                onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
              />
            </div>
            <div>
              <Label>Custom Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                value={form.customAmount}
                onChange={(e) => setForm((f) => ({ ...f, customAmount: e.target.value }))}
              />
            </div>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input
                placeholder="Enter full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                placeholder="Enter email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="10-digit number"
                maxLength={10}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="relative">
              <Label>Password</Label>
              <Input
                placeholder="Set password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-[28px] text-gray-500 hover:text-gray-700"
                onClick={() => setShowPass((p) => !p)}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>

          {/* ID Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Government ID Type</Label>
              <Select
                value={form.govIdType}
                onValueChange={(v) => setForm((f) => ({ ...f, govIdType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ID Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                  <SelectItem value="Passport">Passport</SelectItem>
                  <SelectItem value="Voter ID">Voter ID</SelectItem>
                  <SelectItem value="Driving License">Driving License</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Government ID Number</Label>
              <Input
                placeholder="Enter ID number"
                value={form.govIdNumber}
                onChange={(e) => setForm((f) => ({ ...f, govIdNumber: e.target.value }))}
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <Label>Payment Mode</Label>
            <Select
              value={form.paymentMode}
              onValueChange={(v) => setForm((f) => ({ ...f, paymentMode: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={submit}
            disabled={loading}
            className="w-full text-lg mt-6 py-5 font-semibold rounded-xl">
            {loading ? "Processing..." : "Confirm Booking"}
          </Button>
        </div>
      </div>
    </div>
  );
}
