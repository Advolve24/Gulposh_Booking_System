import { useEffect, useMemo, useState } from "react";
import {
  listUsersAdmin,
  getUserAdminById,
  listUserBookingsAdmin,
  cancelBookingAdmin,           // <-- add
} from "../api/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";

const fmt = (d) => (d ? format(new Date(d), "dd MMM yy") : "—");

export default function Users() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailBookings, setDetailBookings] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await listUsersAdmin();
      setUsers(data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return users;
    return users.filter(u =>
      (u.name || "").toLowerCase().includes(x) ||
      (u.email || "").toLowerCase().includes(x) ||
      (u.phone || "").toLowerCase().includes(x)
    );
  }, [q, users]);

  const openDetail = async (id) => {
    setOpen(true);
    setDetailLoading(true);
    try {
      const [u, b] = await Promise.all([
        getUserAdminById(id),
        listUserBookingsAdmin(id),
      ]);
      setDetail(u);
      setDetailBookings(b);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load user");
    } finally {
      setDetailLoading(false);
    }
  };

  const doCancel = async (bookingId) => {
    const ok = confirm("Cancel this booking? This cannot be undone.");
    if (!ok) return;

    try {
      await toast.promise(cancelBookingAdmin(bookingId), {
        loading: "Cancelling…",
        success: "Booking cancelled",
        error: (err) => err?.response?.data?.message || "Failed to cancel booking",
      });
      // update local state
      setDetailBookings(list =>
        list.map(b => b._id === bookingId ? { ...b, status: "cancelled" } : b)
      );
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-semibold">Users</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All users</CardTitle>
          <Input
            className="w-64"
            placeholder="Search name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No users</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Bookings</th>
                    <th className="py-2 pr-4">Joined</th>
                    <th className="py-2 pr-4">Last booking</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u._id} className="border-t">
                      <td className="py-2 pr-4">{u.name || "—"}</td>
                      <td className="py-2 pr-4">{u.email || "—"}</td>
                      <td className="py-2 pr-4">{u.phone || "—"}</td>
                      <td className="py-2 pr-4">{u.bookingsCount ?? 0}</td>
                      <td className="py-2 pr-4">{fmt(u.createdAt)}</td>
                      <td className="py-2 pr-4">{fmt(u.lastBookingAt)}</td>
                      <td className="py-2 pr-4">
                        <Button size="sm" variant="outline" onClick={() => openDetail(u._id)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading…</div>
          ) : !detail ? (
            <div className="py-10 text-center text-muted-foreground">No user loaded</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Name: </span>{detail.name || "—"}</div>
                <div><span className="text-muted-foreground">Email: </span>{detail.email || "—"}</div>
                <div><span className="text-muted-foreground">Phone: </span>{detail.phone || "—"}</div>
                <div><span className="text-muted-foreground">Joined: </span>{fmt(detail.createdAt)}</div>
              </div>

              <div className="border-t pt-3">
                <div className="font-medium mb-2">Bookings</div>
                {detailBookings.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No bookings</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-4">Room</th>
                          <th className="py-2 pr-4">From</th>
                          <th className="py-2 pr-4">To</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Created</th>
                          <th className="py-2 pr-4">Actions</th> {/* NEW */}
                        </tr>
                      </thead>
                      <tbody>
                        {detailBookings.map(b => (
                          <tr key={b._id} className="border-t">
                            <td className="py-2 pr-4">{b.room?.name || "—"}</td>
                            <td className="py-2 pr-4">{fmt(b.startDate)}</td>
                            <td className="py-2 pr-4">{fmt(b.endDate)}</td>
                            <td className="py-2 pr-4">{b.status}</td>
                            <td className="py-2 pr-4">{fmt(b.createdAt)}</td>
                            <td className="py-2 pr-4">
                              {b.status !== "cancelled" ? (
                                <Button size="sm" variant="destructive" onClick={() => doCancel(b._id)}>
                                  Cancel this booking
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
