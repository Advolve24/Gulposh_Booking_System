import { useEffect, useMemo, useState } from "react";
import { listBookingsAdmin, cancelBookingAdmin, listRooms } from "../api/admin.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

const fmt = (d) => (d ? format(new Date(d), "dd MMM yy") : "—");
const diffNightsInclusive = (from, to) => {
    const a = new Date(from), b = new Date(to);
    a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
};
const StatusBadge = ({ status }) => {
    const map = { cancelled: "destructive", confirmed: "default", pending: "secondary" };
    return <Badge variant={map[status] || "outline"} className="capitalize">{status || "unknown"}</Badge>;
};

export default function Bookings() {
    const [rooms, setRooms] = useState([]);
    const [roomId, setRoomId] = useState("all");
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);

    const [status, setStatus] = useState("all");
    const [room, setRoom] = useState("");
    const [q, setQ] = useState("");
    const [range, setRange] = useState();

    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        listRooms().then(setRooms).catch(() => setRooms([]));
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const params = {};
            if (status && status !== "all") params.status = status;
            if (roomId && roomId !== "all") params.room = roomId;
            if (q) params.q = q.trim();
            if (range?.from && range?.to) {
                params.from = new Date(range.from).toISOString();
                params.to = new Date(range.to).toISOString();
            }
            const data = await listBookingsAdmin(params);
            setBookings(Array.isArray(data) ? data : (data?.items || []));
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { load(); }, [status, room]);

    const totals = useMemo(() => {
        const t = bookings.length;
        const cancelled = bookings.filter(b => b.status === "cancelled").length;
        const confirmed = bookings.filter(b => b.status !== "cancelled").length;
        return { total: t, confirmed, cancelled };
    }, [bookings]);

    const onOpenView = (b) => { setSelected(b); setOpen(true); };

    const onCancel = async () => {
        if (!selected?._id) return;
        if (!confirm("Cancel this booking?")) return;
        setCancelling(true);
        try {
            await cancelBookingAdmin(selected._id);
            toast.success("Booking cancelled");
            setOpen(false);
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Cancel failed");
        } finally {
            setCancelling(false);
        }
    };


    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 ">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.total}</CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Confirmed</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.confirmed}</CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cancelled</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.cancelled}</CardContent></Card>
            </div>

            {/* Table */}
            <Card className="pt-4">
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Bookings</CardTitle>
                    <div className="flex justify-end w-[70%] gap-2">
                        <div className="w-[40%] -mt-6">
                            <label className="text-sm block mb-1">Status</label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="secondary" onClick={load} disabled={loading}>
                            {loading ? "Loading..." : "Refresh"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                            <tr>
                                <th className="py-2 pr-4">Guest</th>
                                <th className="py-2 pr-4">Room</th>
                                <th className="py-2 pr-4">Dates</th>
                                <th className="py-2 pr-4">Nights</th>
                                <th className="py-2 pr-4">Guests</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Created</th>
                                <th className="py-2 pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(b => {
                                const nights = diffNightsInclusive(b.startDate, b.endDate);
                                return (
                                    <tr key={b._id} className="border-t">
                                        <td className="py-2 pr-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{b.user?.name || b.guestName || "—"}</span>
                                                <span className="text-xs text-muted-foreground">{b.user?.email || b.guestEmail || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 pr-4">{b.room?.name || b.roomName || "—"}</td>
                                        <td className="py-2 pr-4">{fmt(b.startDate)} → {fmt(b.endDate)}</td>
                                        <td className="py-2 pr-4">{nights}</td>
                                        <td className="py-2 pr-4">{b.guests ?? "—"}</td>
                                        <td className="py-2 pr-4"><StatusBadge status={b.status} /></td>
                                        <td className="py-2 pr-4">{fmt(b.createdAt)}</td>
                                        <td className="py-2 pr-4">
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => onOpenView(b)}>View</Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => { setSelected(b); onCancel(); }}
                                                    disabled={b.status === "cancelled"}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {bookings.length === 0 && (
                                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No bookings found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* View dialog with "Cancel this booking" */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Booking details</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-2 text-sm">
                            <div><span className="text-muted-foreground">Booking ID:</span> {selected._id}</div>
                            <div><span className="text-muted-foreground">Room:</span> {selected.room?.name || selected.roomName || "—"}</div>
                            <div><span className="text-muted-foreground">Dates:</span> {fmt(selected.startDate)} → {fmt(selected.endDate)}</div>
                            <div><span className="text-muted-foreground">Nights:</span> {diffNightsInclusive(selected.startDate, selected.endDate)}</div>
                            <div><span className="text-muted-foreground">Guests:</span> {selected.guests ?? "—"}</div>
                            {(() => {
                                const withMeal =
                                    selected?.withMeal ??
                                    selected?.meal ??
                                    selected?.includeMeal ??
                                    selected?.mealIncluded ??
                                    false;

                                return (
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">With meal:</span>
                                        {withMeal ? (
                                            <span className="inline-flex items-center gap-1 text-green-600">
                                                <CheckCircle className="h-4 w-4" />
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-600">
                                                <XCircle className="h-4 w-4" />
                                                No
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selected.status} /></div>
                            <div><span className="text-muted-foreground">Created:</span> {fmt(selected.createdAt)}</div>
                            {selected.note && <div><span className="text-muted-foreground">Note:</span> {selected.note}</div>}
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                        <Button
                            variant="destructive"
                            onClick={onCancel}
                            disabled={cancelling || selected?.status === "cancelled"}
                        >
                            {cancelling ? "Cancelling..." : "Cancel this booking"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
