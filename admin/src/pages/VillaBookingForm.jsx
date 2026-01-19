import { useEffect, useState } from "react";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { loadRazorpayScript } from "../lib/loadRazorpay";
import { toDateOnlyUTC, todayDateOnlyUTC, toDateOnlyFromAPIUTC } from "../lib/date";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";

const toDateKey = (date) => format(date, "yyyy-MM-dd");

const isBooked = (date) => bookedDates.has(toDateKey(date));

const isBlocked = (date) => {
  const key = toDateKey(date);
  return blockedRanges.some(
    (b) => key >= b.fromKey && key <= b.toKey
  );
};

const isRangeValid = (from, to) => {
  let d = toDateKey(from);
  const end = toDateKey(to);

  while (d <= end) {
    if (bookedDates.has(d)) return false;
    if (
      blockedRanges.some(
        (b) => d >= b.fromKey && d <= b.toKey
      )
    ) {
      return false;
    }
    d = toDateKey(addDays(new Date(d), 1));
  }
  return true;
};


export default function VillaBookingForm() {
  const navigate = useNavigate();
  const [range, setRange] = useState();
  const [disabled, setDisabled] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookedDates, setBookedDates] = useState(new Set());
  const [blockedRanges, setBlockedRanges] = useState([]);

  const [userId, setUserId] = useState(null);
  const [userChecked, setUserChecked] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
    guests: 1,
    customAmount: "",
    govIdType: "",
    govIdNumber: "",
    paymentMode: "Online",
  });

  useEffect(() => {
    (async () => {
      try {
        const [bookedRes, blackoutRes] = await Promise.all([
          api.get("/bookings"),
          api.get("/blackouts"),
        ]);
        const bookedSet = new Set();
        (bookedRes.data || []).forEach((b) => {
          let d = toDateKey(new Date(b.startDate));
          const end = toDateKey(new Date(b.endDate));
          while (d <= end) {
            bookedSet.add(d);
            d = toDateKey(addDays(new Date(d), 1));
          }
        });
        setBookedDates(bookedSet);
        setBlockedRanges(
          (blackoutRes.data || []).map((b) => ({
            fromKey: toDateKey(new Date(b.from)),
            toKey: toDateKey(new Date(b.to)),
          }))
        );
      } catch {
        toast.error("Failed to load availability");
      }
    })();
  }, []);


  const checkUserByPhone = async () => {
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      toast.error("Enter valid 10-digit phone number");
      return;
    }

    try {
      const { data } = await api.get(
        `/admin/users/check-phone/${form.phone}`
      );

      setUserChecked(true);

      if (data.exists) {
        setUserId(data.user.id);
        setForm((f) => ({
          ...f,
          name: data.user.name || "",
          email: data.user.email || "",
          dob: data.user.dob ? new Date(data.user.dob) : null,
        }));
        toast.success("User found! Details auto-filled.");
      } else {
        setUserId(null);
        toast.info("User not found. Please enter details to register.");
      }
    } catch {
      toast.error("Failed to check user");
    }
  };

  /* ================= CREATE USER IF REQUIRED ================= */
  const ensureUserExists = async () => {
    if (userId) return userId;

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      dob: form.dob
        ? form.dob.toISOString().split("T")[0]
        : null,
    };

    const { data } = await api.post("/admin/users", payload);
    setUserId(data.id);
    return data.id;
  };

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    if (!userChecked) throw new Error("Please check mobile number first");
    if (!form.name || form.name.length < 3)
      throw new Error("Enter valid name");
    if (!form.phone) throw new Error("Phone is required");
    if (!form.customAmount || form.customAmount <= 0)
      throw new Error("Enter valid amount");
    if (!range?.from || !range?.to)
      throw new Error("Select booking dates");
  };

  /* ================= SUBMIT ================= */
  const submit = async () => {
    try {
      setLoading(true);
      validateForm();

      const uid = await ensureUserExists();

      const start = toDateOnlyUTC(range.from);
      const end = toDateOnlyUTC(range.to);

      /* ===== CASH BOOKING ===== */
      if (form.paymentMode === "Cash") {
        await api.post("/admin/villa-verify", {
          userId: uid,
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

        toast.success("Booking confirmed (Cash)");
        return navigate("/dashboard");
      }

      /* ===== ONLINE BOOKING ===== */
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Razorpay failed to load");

      const { data: order } = await api.post("/admin/villa-order", {
        userId: uid,
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
        order_id: order.orderId,
        handler: async (resp) => {
          await api.post("/admin/villa-verify", {
            userId: uid,
            startDate: start,
            endDate: end,
            guests: form.guests,
            customAmount: form.customAmount,
            contactName: form.name,
            contactEmail: form.email,
            contactPhone: form.phone,
            govIdType: form.govIdType,
            govIdNumber: form.govIdNumber,
            paymentMode: "Online",
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });

          toast.success("Booking confirmed successfully!");
          navigate("/dashboard");
        },
        modal: {
          ondismiss: () => toast("Payment cancelled"),
        },
      });

      rzp.open();
    } catch (err) {
      toast.error(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };



  return (
    <AppLayout>
      <div className="w-full md:max-w-6xl bg-white shadow-md rounded-2xl p-4 md:p-8 mt-0 mb-6">
        <div className="flex flex-wrap md:items-center justify-between gap-8">

          {/* ================= CALENDAR ================= */}
          <div className="w-full md:w-[50%]">
            <Label className="mb-2 block text-gray-600">Select Dates</Label>
            <Calendar
              mode="range"
              numberOfMonths={1}
              fromDate={todayDateOnlyUTC()}
              selected={range}
              onSelect={(r) => {
                if (!r?.from) {
                  setRange(undefined);
                  return;
                }

                if (r.to && !isRangeValid(r.from, r.to)) {
                  toast.error("Selected range includes booked or blocked dates");
                  return;
                }

                setRange(r);
              }}
              disabled={(date) =>
                date < todayDateOnlyUTC() ||
                isBooked(date) ||
                isBlocked(date)
              }
              className="border rounded-lg shadow-sm w-full md:w-[500px]"
            />
          </div>

          {/* ================= FORM ================= */}
          <div className="w-full md:w-[45%] space-y-5">

            {/* ===== USER CHECK ===== */}
            <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
              <Label>Customer Mobile Number</Label>

              <div className="flex gap-2">
                <Input
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
                <Button
                  type="button"
                  onClick={checkUserByPhone}
                  variant="secondary"
                >
                  Check User
                </Button>
              </div>

              {userChecked && userId && (
                <p className="text-sm text-green-600 font-medium">
                  ✔ User found. Details auto-filled.
                </p>
              )}

              {userChecked && !userId && (
                <p className="text-sm text-orange-600 font-medium">
                  ⚠ User not found. Please enter details to register.
                </p>
              )}
            </div>

            {/* ===== BOOKING DETAILS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Guests</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.guests}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, guests: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Custom Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.customAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customAmount: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* ===== PERSONAL INFO ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  disabled={!!userId}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  disabled={!!userId}
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!!userId}
                      className="justify-between"
                    >
                      {form.dob ? format(form.dob, "dd MMM yyyy") : "Select DOB"}
                      <CalendarIcon className="h-4 w-4 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={form.dob}
                      onSelect={(d) =>
                        setForm((f) => ({ ...f, dob: d }))
                      }
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Government ID Type</Label>
                <Select
                  value={form.govIdType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, govIdType: v }))
                  }
                >
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
                  value={form.govIdNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, govIdNumber: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Payment Mode</Label>
                <Select
                  value={form.paymentMode}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, paymentMode: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ===== SUBMIT ===== */}
            <Button
              onClick={submit}
              disabled={loading || !userChecked}
              className="w-full text-lg py-5 font-semibold rounded-xl"
            >
              {loading ? "Processing..." : "Confirm Booking"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}