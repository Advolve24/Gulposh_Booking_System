// admin/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import {
  getStats,
  listBlackouts,
  addBlackout,
  removeBlackout,
  listRooms,
  deleteRoom,
} from "../api/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarRangeIcon,
  Users2,
  BedSingle,
  ClipboardList,
  Trash2,
  Eye,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ✅ Use the shared helpers
import { toDateOnly, todayDateOnly } from "../lib/date";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    rooms: 0,
    bookings: 0,
    upcoming: 0,
  });
  const [range, setRange] = useState();
  const [blackouts, setBlackouts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingBlk, setLoadingBlk] = useState(false);
  const [disabled, setDisabled] = useState(() => [{ before: todayDateOnly() }]); // ← imported
  const navigate = useNavigate();

  // Load top-level data
  const reload = async () => {
    try {
      const [s, b, r] = await Promise.all([
        getStats(),
        listBlackouts(),
        listRooms(),
      ]);
      setStats(s);
      setBlackouts(b);
      setRooms(r);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load dashboard");
    }
  };
  useEffect(() => {
    reload();
  }, []);

  // Build disabled ranges: past dates + booked ranges + blackouts
  useEffect(() => {
    (async () => {
      try {
        let res = await fetch(`${API_ROOT}/rooms/disabled/all`, {
          credentials: "include",
        });
        if (!res.ok) {
          res = await fetch(`${API_ROOT}/rooms/blocked/all`, {
            credentials: "include",
          });
        }
        const bookedJson = res.ok ? await res.json() : [];

        const booked = (bookedJson || []).map((r) => ({
          from: toDateOnly(r.from || r.startDate),
          to: toDateOnly(r.to || r.endDate),
        }));

        const blackoutRanges = (blackouts || []).map((b) => ({
          from: toDateOnly(b.from),
          to: toDateOnly(b.to),
        }));

        setDisabled([{ before: todayDateOnly() }, ...booked, ...blackoutRanges]);
      } catch (err) {
        console.error("Failed to build disabled ranges:", err);
      }
    })();
  }, [blackouts]);

  const fmt = (d) => format(new Date(d), "dd MMM yy");

  // Overlap guard for blocking
  const picked =
    range?.from && range?.to
      ? { from: toDateOnly(range.from), to: toDateOnly(range.to) }
      : null;
  const blocks = disabled.filter((d) => d.from && d.to);
  const overlaps = (a, b) => !(a.to < b.from || a.from > b.to);
  const hasConflict = !!(picked && blocks.some((b) => overlaps(picked, b)));

  const blockSelected = async () => {
    if (!picked) return toast.error("Select a start and end date");
    if (hasConflict) {
      return toast.error(
        "Selected dates overlap an existing booking/blackout."
      );
    }
    setLoadingBlk(true);
    try {
      await addBlackout({ from: picked.from, to: picked.to });
      toast.success("Dates blocked");
      setRange(undefined);
      setBlackouts(await listBlackouts()); // refresh
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

  const statCard = (icon, label, value) => (
    <Card className="w-[48%] md:w-full">
      <CardHeader className="p-0 md:p-4">
        <CardTitle className="text-sm text-muted-foreground md:flex items-center gap-2">
          <div className="p-4 bg-primary md:rounded-[10px] rounded-t-[10px] text-white flex justify-center">{icon}</div>
          <div className="text-2xl font-semibold flex flex-col md:ml-6 mt-0 md:p-0 p-4">
            <div>{value}</div>
            <div className="text-[16px] font-normal">{label}</div>
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );

  return (
    <div className="max-w-6xl p-6 mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* LEFT: overview */}
      <div className="md:col-span-1 md:flex-col md:gap-4 md:justify-start flex flex-row gap-3 justify-between flex-wrap">
        {statCard(<Users2 className="h-6 w-6" />, "Users", stats.users)}
        {statCard(
          <ClipboardList className="h-6 w-6" />,
          "Active bookings",
          stats.bookings
        )}
        {statCard(<BedSingle className="h-6 w-6" />, "Rooms", stats.rooms)}
        {statCard(
          <CalendarRangeIcon className="h-6 w-6" />,
          "Upcoming stays",
          stats.upcoming
        )}
      </div>

      {/* RIGHT: calendar + rooms */}
      <div className="md:col-span-2 flex flex-col gap-6">

        {/* Calendar + From-To Block Dates in one row */}
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Calendar Section */}
          <Card className="w-full sm:basis-[60%]">
            <CardHeader>
              <CardTitle>Block / Unblock Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="range"
                numberOfMonths={1}
                selected={range}
                onSelect={setRange}
                disabled={disabled}
                className="rounded-md border w-full [--cell-size:32px] bg-white"
              />
            </CardContent>
          </Card>

          {/* From-To Block Dates Section */}
          <Card className="w-full sm:basis-[40%]">
            <CardHeader>
              <CardTitle>Selected Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-1">
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
                    <Badge key={b._id} variant="secondary" className="gap-2 bg-[#fffaf6] text-[14px] mt-1">
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
            </CardContent>
          </Card>
        </div>


        {/* Rooms Section */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex justify-between w-full">
              <CardTitle>Rooms</CardTitle>
              <Button onClick={() => navigate("/rooms/new")} size="sm">
                Add room
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Room</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">With meal</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r._id} className="border-t">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2 md:w-[290px] w-[200px]">  
                          {r.coverImage ? (
                            <img
                              src={r.coverImage}
                              alt=""
                              className="h-[60px] w-[180px] object-cover rounded"
                            />
                          ) : (
                            <div className="h-10 w-14 bg-muted rounded" />
                          )}
                          <div className="font-medium w-[70%]">{r.name}</div>
                        </div>
                      </td>
                      <td className="py-2 pr-4">₹{r.pricePerNight}</td>
                      <td className="py-2 pr-4">₹{r.priceWithMeal}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline"
                            onClick={() =>
                              window.open(
                                `${import.meta.env.VITE_PUBLIC_URL || "http://localhost:5174/"}/room/${r._id}`,
                                "_blank"
                              )
                            }>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline"
                            onClick={() => navigate(`/rooms/new?id=${r._id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" onClick={() => onDeleteRoom(r._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rooms.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
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
