import { useEffect, useState, useLayoutEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { useAuth } from "@/store/authStore";


import {
    Check,
    MapPin,
    Calendar,
    Users,
    Download,
    Home,
    Mail,
    Phone,
    User,
} from "lucide-react";

import { api } from "@/api/http";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";


const fmt = (d) =>
    format(new Date(d), "dd MMM yyyy");

const calcNights = (start, end) =>
    Math.max(
        1,
        Math.round(
            (new Date(end) - new Date(start)) /
            (1000 * 60 * 60 * 24)
        )
    );


const fireConfetti = () => {
    const colors = [
        "#ff3b3b",
        "#ffb703",
        "#3a86ff",
        "#8338ec",
        "#06d6a0",
        "#ff006e",
    ];

    confetti({
        particleCount: 160,
        spread: 90,
        startVelocity: 65,
        gravity: 0.8,
        ticks: 200,
        scalar: 1,
        colors,
        origin: { x: 0.5, y: -0.15 },
    });

    const duration = 1100;
    const animationEnd = Date.now() + duration;

    const frame = () => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return;

        const progress = timeLeft / duration;

        confetti({
            particleCount: Math.ceil(12 * progress),
            startVelocity: 40 * progress,
            spread: 90,
            gravity: 1,
            ticks: 230,
            scalar: 1,
            colors,
            origin: {
                x: Math.random(),
                y: -0.15,
            },
        });

        requestAnimationFrame(frame);
    };

    frame();
};


export default function BookingSuccess() {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const confettiRan = { current: false };
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    useLayoutEffect(() => {
        if (confettiRan.current) return;
        confettiRan.current = true;

        fireConfetti();
    }, []);

    useEffect(() => {
        fireConfetti();

        (async () => {
            try {
                const { data } = await api.get(`/bookings/${id}`);
                setBooking(data);
            } catch {
                navigate("/", { replace: true });
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    if (loading || !booking) return null;

    const room = booking.room;
    const mealMode = room?.mealMode;
    const nights = calcNights(
        booking.startDate,
        booking.endDate
    );

    const roomImage =
        room?.images?.[0] ||
        room?.coverImage ||
        "/placeholder.jpg";



    return (
        <div className="min-h-screen bg-[#fff7f7]">

            {/* ================= HERO ================= */}
            <section className="bg-red-700 text-white py-10 px-4 text-center relative overflow-hidden">
                <div className="max-w-2xl mx-auto space-y-4">

                    <div className="mx-auto h-14 w-14 rounded-full bg-white flex items-center justify-center">
                        <Check className="h-7 w-7 text-red-700" />
                    </div>

                    <p className="text-xs uppercase tracking-widest opacity-80">
                        Booking Confirmed
                    </p>

                    <h1 className="text-3xl md:text-4xl font-serif font-semibold">
                        Thank You!
                    </h1>

                    <p className="text-sm opacity-90">
                        Your reservation at <b>{room.name}</b> has been confirmed.
                        Get ready for an unforgettable stay!
                    </p>

                    <span className="inline-block mt-3 px-4 py-1 rounded-full bg-white/20 text-xs">
                        Booking ID: #{booking._id.slice(-8).toUpperCase()}
                    </span>
                </div>
            </section>

            {/* ================= CONTENT ================= */}
            <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

                {/* SUMMARY CARD */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2">
                    <img
                        src={roomImage}
                        alt={room.name}
                        className="h-20 md:h-full w-full object-cover"
                    />

                    <div className="p-6 space-y-4">
                        <h2 className="text-xl font-serif font-semibold">
                            {room.name}
                        </h2>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {room.location || "Karjat, Maharashtra, India"}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-muted rounded-lg p-3">
                                <div className="text-xs">Check-in</div>
                                <div className="font-medium">
                                    {fmt(booking.startDate)}
                                </div>
                            </div>

                            <div className="bg-muted rounded-lg p-3">
                                <div className="text-xs">Check-out</div>
                                <div className="font-medium">
                                    {fmt(booking.endDate)}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {booking.guests} Guests
                            </div>

                            {mealMode === "price" && booking.withMeal && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    Veg: {booking.vegGuests || 0} · Non-Veg: {booking.nonVegGuests || 0}
                                </div>
                            )}

                            {mealMode === "only" && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    Veg & Non-Veg meals included
                                </div>
                            )}

                        </div>

                        <Separator />

                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    Total Paid ({nights} nights)
                                </div>
                                <div className="text-xl font-semibold text-red-600">
                                    ₹{(booking.amount || booking.totalAmount || 0).toLocaleString("en-IN")}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Including all taxes
                            </div>
                        </div>
                    </div>
                </div>

                {/* GUEST DETAILS */}
                <div className="bg-white rounded-2xl border p-6 space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-red-700" />
                        Guest Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">

                        {/* ================= LEFT — USER INFO ================= */}
                        <div className="space-y-4">

                            {/* NAME */}
                            <div className="flex items-start gap-3">
                                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="text-xs text-muted-foreground">Guest Name</div>
                                    <div className="font-medium">
                                        {user?.name || booking.contactName}
                                    </div>
                                </div>
                            </div>

                            {/* EMAIL */}
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="text-xs text-muted-foreground">Email Address</div>
                                    <div className="font-medium break-all">
                                        {user?.email || booking.contactEmail}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* ================= RIGHT — CONTACT & ADDRESS ================= */}
                        <div className="space-y-4">

                            {/* PHONE */}
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="text-xs text-muted-foreground">Phone Number</div>
                                    <div className="font-medium">
                                        {user?.phone || booking.contactPhone || "—"}
                                    </div>
                                </div>
                            </div>

                            {/* ADDRESS */}
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Address
                                    </div>
                                    <div className="font-medium leading-relaxed space-y-1">

                                        {/* ROW 1 — STREET */}
                                        <div>
                                            {user?.address || booking.address?.address || "—"}
                                        </div>

                                        {/* ROW 2 — CITY / STATE / PIN / COUNTRY */}
                                        <div>
                                            {(user?.city || booking.address?.city) && (
                                                <>
                                                    {user?.city || booking.address?.city},{" "}
                                                </>
                                            )}
                                            {user?.state || booking.address?.state}{" "}
                                            {user?.pincode || booking.address?.pincode}
                                            {", "}
                                            {user?.country || booking.address?.country}
                                        </div>

                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>



                {/* ACTIONS */}
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button className="bg-red-700 hover:bg-red-800">
                        <Download className="w-4 h-4 mr-2" />
                        Download Confirmation
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => navigate("/")}
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </div>

                {/* EMAIL NOTE */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-center">
                    A confirmation email has been sent to{" "}
                    <b>{booking.contactEmail}</b>.
                    <br />
                    Please check your inbox for detailed booking information.
                </div>
            </div>
        </div>
    );
}
