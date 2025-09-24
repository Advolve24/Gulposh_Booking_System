import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { loadRazorpayScript } from "../lib/loadRazorpay";
import { toDateOnlyUTC, todayDateOnlyUTC, toDateOnlyFromAPIUTC } from "../lib/date";
import { useNavigate } from "react-router-dom";


export default function VillaBookingForm() {
    const [range, setRange] = useState();
    const [disabled, setDisabled] = useState([]);
    const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", guests: 1, customAmount: "" });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // fetch disabled ranges
    useEffect(() => {
        (async () => {
            try {
                const [booked, blackouts] = await Promise.all([
                    api.get("/rooms/disabled/all"),
                    api.get("/blackouts")
                ]);
                const bookedRanges = (booked.data || []).map(b => ({
                    from: toDateOnlyFromAPIUTC(b.from || b.startDate),
                    to: toDateOnlyFromAPIUTC(b.to || b.endDate),
                }));
                const blkRanges = (blackouts.data || []).map(b => ({
                    from: toDateOnlyFromAPIUTC(b.from),
                    to: toDateOnlyFromAPIUTC(b.to),
                }));
                setDisabled([...bookedRanges, ...blkRanges]);
            } catch (e) {
                console.error("failed to load villa disabled ranges", e);
            }
        })();
    }, []);

    async function ensureUserExists() {
        const { name, email, phone, password } = form;
        if (!name || !email || !phone || !password) throw new Error("Fill all user fields");
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
            await ensureUserExists();

            const start = toDateOnlyUTC(range.from);
            const end = toDateOnlyUTC(range.to);
            if (!start || !end) return toast.error("Pick dates");
            if (!form.customAmount) return toast.error("Enter custom amount");

            const ok = await loadRazorpayScript();
            if (!ok) throw new Error("Razorpay script failed");

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
                name: "Entire Villa",
                description: `Villa Booking`,
                order_id: order.orderId,
                prefill: {
                    name: form.name,
                    email: form.email,
                    contact: form.phone,
                },
                handler: async (resp) => {
                    try {
                        await api.post("/admin/villa-verify", {
                            ...resp,
                            startDate: start,
                            endDate: end,
                            guests: form.guests,
                            customAmount: form.customAmount,
                            contactName: form.name,
                            contactEmail: form.email,
                            contactPhone: form.phone,
                        });
                        toast.success("Villa booking confirmed!");
                        navigate("/dashboard");
                    } catch (err) {
                        toast.error(err?.response?.data?.message || "Verification failed");
                    }
                },
                modal: { ondismiss: () => toast("Payment cancelled.") }
            });

            rzp.open();
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Could not start payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl flex flex-wrap justify-between mx-auto p-6 bg-white shadow rounded space-y-6 mt-4">
            <h2 className="text-xl font-bold w-full">Book Entire Villa</h2>

            <Calendar className="w-[35%]" mode="range" selected={range} onSelect={setRange} disabled={[{ before: todayDateOnlyUTC() }, ...disabled]} numberOfMonths={1} />

            <div className="w-[48%]">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Guests</Label>
                    <Input type="number" value={form.guests} onChange={(e) => setForm(f => ({ ...f, guests: e.target.value }))} />
                </div>
                <div>
                    <Label>Custom Amount (₹)</Label>
                    <Input type="number" value={form.customAmount} onChange={(e) => setForm(f => ({ ...f, customAmount: e.target.value }))} />
                </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                    <Label>Password</Label>
                    <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
            </div>

            <Button onClick={submit} disabled={loading} className="w-full mt-4">
                {loading ? "Processing..." : "Proceed to Payment"}
            </Button>
            </div>
        </div>
    );
}
