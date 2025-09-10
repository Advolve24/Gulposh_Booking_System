import { useEffect, useMemo, useState } from "react";
import { getMyBookings, cancelBooking } from "../api/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fmt = (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const isFuture = (d) => new Date(d) > new Date();

export default function MyBookings() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = async () => {
        setLoading(true);
        try {
            setItems(await getMyBookings());
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { reload(); }, []);

    const upcoming = useMemo(() => items.filter((b) => isFuture(b.startDate)), [items]);
    const past = useMemo(() => items.filter((b) => !isFuture(b.startDate)), [items]);

    const onCancel = async (id) => {
        if (!confirm("Cancel this booking?")) return;
        try {
            await cancelBooking(id);
            toast.success("Booking canceled");
            reload();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to cancel");
        }
    };

    const Section = ({ title, data }) => (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            {data.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.map((b) => (
                        <Card key={b._id} className="overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-stretch">
                                {/* LEFT: text/content */}
                                <div className="flex-1">
                                    <CardHeader className="flex items-start justify-between pb-2">
                                        <CardTitle className="text-base">{b.room?.name || "Room"}</CardTitle>
                                        <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                                            {b.status}
                                        </Badge>
                                    </CardHeader>

                                    <CardContent className="space-y-2 pt-0">
                                        <div className="text-sm">
                                            <span className="font-medium">Dates: </span>
                                            {fmt(b.startDate)} → {fmt(b.endDate)}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-medium">Guests: </span>{b.guests}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-medium">Total: </span>₹{b.amount}
                                        </div>

                                        <div className="pt-2 flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => window.open(`/room/${b.room?._id}`, "_blank")}>
                                                View
                                            </Button>
                                            {isFuture(b.startDate) && b.status === "confirmed" && (
                                                <Button size="sm" variant="destructive" onClick={() => onCancel(b._id)}>
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </div>

                                {/* RIGHT: image */}
                                <div className="sm:w-56 w-full sm:border-l p-4 sm:p-4 pt-0 sm:pt-4">
                                    <div className="relative w-full h-32 sm:h-52">
                                        <img
                                            src={b.room?.coverImage || "/placeholder.jpg"}
                                            alt={b.room?.name || "Room"}
                                            className="w-full h-full object-cover rounded-md border"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-heading">My bookings</h1>
            {loading ? <p className="text-sm">Loading…</p> : (
                <>
                    <Section title="Upcoming" data={upcoming} />
                    <Section title="Past" data={past} />
                </>
            )}
        </div>
    );
}
