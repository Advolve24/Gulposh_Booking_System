import { useEffect, useMemo, useState } from "react";
import {
  listUsersAdmin,
  getUserAdminById,
  listUserBookingsAdmin,
  cancelBookingAdmin,
} from "../api/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { updateUserAdmin, deleteUserAdmin } from "../api/admin";

const fmt = (d) => (d ? format(new Date(d), "dd MMM yy") : "—");

export default function Users() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailBookings, setDetailBookings] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const onOpenUser = (u) => {
    setSelected(u);
    setEditMode(false);
    setEditName(u?.name || "");
    setEditEmail(u?.email || "");
    setEditPhone(u?.phone || "");
    setOpen(true);
  };


const saveUser = async () => {
  if (!selected?._id) return;
  setSaving(true);
  try {
    const apiRes = await updateUserAdmin(selected._id, {
      name:  editName,
      email: editEmail,
      phone: editPhone,
    });
    const updated = {
      ...apiRes,
      phone: apiRes?.phone ?? apiRes?.mobile ?? editPhone,
    };
    toast.success("User updated");
    setSelected(prev => ({ ...prev, ...updated }));
    setUsers(prev =>
      prev.map(u =>
        u._id === selected._id
          ? {
              ...u,
              name:  updated.name ?? u.name,
              email: updated.email ?? u.email,
              phone: updated.phone ?? u.phone,   
            }
          : u
      )
    );
    setEditMode(false);
  } catch (e) {
    toast.error(e?.response?.data?.message || "Update failed");
  } finally {
    setSaving(false);
  }
};


  const removeUser = async () => {
    if (!selected?._id) return;
    if (!confirm("Delete this user? This will remove all their bookings as well.")) return;
    const id = selected._id;
    const prevUsers = users;
    setOpen(false);
    setUsers((list) => list.filter((u) => u._id !== id));
    setSelected(null);
    setDeleting(true);
    try {
      await deleteUserAdmin(id);
      toast.success("User deleted");
    } catch (e) {
      setUsers(prevUsers);
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

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
      setSelected({ ...u, bookings: b });
      setEditMode(false);
      setSelected({ ...u, bookings: b });
      setEditName(u?.name || "");
      setEditEmail(u?.email || "");
      setEditPhone(u?.phone ?? u?.mobile ?? "");
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
    } catch { }
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
                      <td className="py-2 pr-4">{u.phone ?? u.mobile ?? "—"}</td>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex items-center justify-between">
            <DialogTitle>User details</DialogTitle>
            <div className="flex gap-2">
              {!editMode ? (
                <Button variant="outline" onClick={() => setEditMode(true)}>Edit user</Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button onClick={saveUser} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
              <Button onClick={removeUser} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete user"}
              </Button>
            </div>
          </DialogHeader>

          {/* SUMMARY / EDIT FORM */}
          {!editMode ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span>  {selected?.name || "—"}</div>
                <div><span className="text-muted-foreground">Email:</span> {selected?.email || "—"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selected?.phone || "—"}</div>
                <div><span className="text-muted-foreground">Joined:</span> {fmt(selected?.createdAt)}</div>
              </div>

              <div className="pt-4 border-t">
                <div className="font-medium mb-2">Bookings</div>
                <table className="min-w-full text-sm">
                  {/* … header … */}
                  <tbody>
                    {(selected?.bookings || []).map(b => (
                      <tr key={b._id} className="border-t">
                        <td className="py-2 pr-4">{b.room?.name || "—"}</td>
                        <td className="py-2 pr-4">{fmt(b.startDate)}</td>
                        <td className="py-2 pr-4">{fmt(b.endDate)}</td>
                        <td className="py-2 pr-4">{b.status}</td>
                        <td className="py-2 pr-4">{fmt(b.createdAt)}</td>
                      </tr>
                    ))}
                    {(selected?.bookings || []).length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No bookings.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input className="mt-2" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-2" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Phone</Label>
                <Input className="mt-2" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
