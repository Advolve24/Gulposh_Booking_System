import { useEffect, useState } from "react";
import { getStats, listBlackouts, addBlackout, removeBlackout, listRooms, deleteRoom } from "../api/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarRangeIcon, Users2, BedSingle, ClipboardList, Trash2, Eye, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { toDateOnlyUTC, todayDateOnlyUTC, toDateOnlyFromAPIUTC } from "../lib/date";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const toYMD = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, rooms: 0, bookings: 0, upcoming: 0, cancelled: 0, });
  const [range, setRange] = useState();
  const [blackouts, setBlackouts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingBlk, setLoadingBlk] = useState(false);
  const [disabled, setDisabled] = useState(() => [{ before: todayDateOnlyUTC() }]);
  const navigate = useNavigate();

  const reload = async () => {
    try {
      const [s, b, r] = await Promise.all([getStats(), listBlackouts(), listRooms()]);
      setStats(s);
      setBlackouts(b);
      setRooms(r.filter(room => room.name?.toLowerCase() !== "entire villa"));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load dashboard");
    }
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    (async () => {
      try {
        let res = await fetch(`${API_ROOT}/rooms/disabled/all`, { credentials: "include" });
        if (!res.ok) res = await fetch(`${API_ROOT}/rooms/blocked/all`, { credentials: "include" });
        const bookedJson = res.ok ? await res.json() : [];

        const booked = (bookedJson || []).map((r) => ({
          from: toDateOnlyFromAPIUTC(r.from || r.startDate),
          to: toDateOnlyFromAPIUTC(r.to || r.endDate),
        }));

        const blackoutRanges = (blackouts || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from),
          to: toDateOnlyFromAPIUTC(b.to),
        }));

        setDisabled([{ before: todayDateOnlyUTC() }, ...booked, ...blackoutRanges]);
      } catch (err) {
        console.error("Failed to build disabled ranges:", err);
      }
    })();
  }, [blackouts]);

  const fmt = (d) => format(new Date(d), "dd MMM yyyy");

  const picked =
    range?.from && range?.to ? { from: toDateOnlyUTC(range.from), to: toDateOnlyUTC(range.to) } : null;
  const blocks = disabled.filter((d) => d.from && d.to);
  const overlaps = (a, b) => !(a.to < b.from || a.from > b.to);
  const hasConflict = !!(picked && blocks.some((b) => overlaps(picked, b)));

  const blockSelected = async () => {
    if (!picked) return toast.error("Select a start and end date");
    if (hasConflict) return toast.error("Selected dates overlap an existing booking/blackout.");
    setLoadingBlk(true);
    try {
      await addBlackout({ from: toYMD(picked.from), to: toYMD(picked.to) });
      toast.success("Dates blocked");
      setRange(undefined);
      setBlackouts(await listBlackouts());
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to block dates");
    } finally {
      setLoadingBlk(false);
    }
  };

  const removeBlk = async (id) => {
    if (!confirm("Remove this blackout?")) return;
    try {
      await removeBlackout(id);
      setBlackouts(await listBlackouts());
      toast.success("Blackout removed");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to remove");
    }
  };

  const onDeleteRoom = async (id) => {
    if (!confirm("Delete this room?")) return;
    try {
      await deleteRoom(id);
      setRooms(await listRooms());
      toast.success("Room deleted");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };


  const statCard = (icon, label, value, path) => (
    <Card
      onClick={() => navigate(path)}
      className="w-[48%] md:w-full cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardHeader className="p-0 md:p-4">
        <CardTitle className="text-sm text-muted-foreground md:flex items-center gap-2">
          <div className="p-4 bg-primary md:rounded-[10px] rounded-t-[10px] text-white flex justify-center">
            {icon}
          </div>
          <div className="text-3xl font-semibold flex flex-row items-center gap-2 md:ml-6 mt-0 md:p-0 p-4">
            <div className="text-black">{value}</div>
            <div className="text-[16px] mt-1 uppercase font-bold">{label}</div>
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );


  return (
    <div className="max-w-6xl p-6 mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 flex flex-row md:flex-col gap-3 justify-start flex-wrap">
        {statCard(<CalendarRangeIcon className="h-6 w-6" />, "Upcoming stays", stats.upcoming, "/bookings")}
        {statCard(<Users2 className="h-6 w-6" />, "Users", stats.users, "/users")}
        {statCard(<ClipboardList className="h-6 w-6" />, "Cancelled bookings", stats.cancelled, "/bookings?filter=cancelled")}
        <div>
          <Button className="w-full h-[85px] text-[18px] rounded-[12px]">
            <a href="/villa-booking" rel="noopener noreferrer">
              Book Entire Villa
            </a>
          </Button>
        </div>
      </div>


      <div className="md:col-span-2 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Block / Unblock Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
              <Calendar
                mode="range"
                numberOfMonths={1}
                selected={range}
                onSelect={setRange}
                disabled={disabled}
                className="rounded-md border md:w-[400px] w-full [--cell-size:32px] bg-white"
              />

              <div className="flex-1 space-y-3">
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">From: </span>
                    {range?.from ? fmt(range.from) : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">To:&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    {range?.to ? fmt(range.to) : "—"}
                  </div>
                </div>

                <Button
                  onClick={blockSelected}
                  disabled={loadingBlk || !range?.from || !range?.to || hasConflict}
                >
                  Block selected dates
                </Button>

                {hasConflict && (
                  <div className="text-xs text-red-600">
                    Selected range overlaps an existing booking/blackout.
                  </div>
                )}

                <div className="pt-2">
                  <div className="text-sm font-medium mb-2">Current blackouts</div>
                  <div className="flex flex-wrap gap-2">
                    {blackouts.length === 0 && (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                    {blackouts.map((b) => (
                      <Badge key={b._id} variant="secondary" className="gap-2">
                        {fmt(b.from)} – {fmt(b.to)}
                        <button
                          className="ml-1 text-red-600 hover:underline"
                          onClick={() => removeBlk(b._id)}
                        >
                          Remove
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rooms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Manage Rooms</h3>
              <Button onClick={() => navigate("/rooms/new")} size="sm">
                Add Room
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Room</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">With Meal</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r._id} className="border-t">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          {r.coverImage ? (
                            <img
                              src={r.coverImage}
                              alt=""
                              className="h-14 w-28 object-cover rounded"
                            />
                          ) : (
                            <div className="h-10 w-14 bg-muted rounded" />
                          )}
                          <div className="font-medium">{r.name}</div>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        ₹{Number(r.pricePerNight).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-4">
                        ₹{Number(r.priceWithMeal).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() =>
                              window.open(
                                `${import.meta.env.VITE_PUBLIC_URL || ""}/room/${r._id}`,
                                "_blank"
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => navigate(`/rooms/new?id=${r._id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => onDeleteRoom(r._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {rooms.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No rooms yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
