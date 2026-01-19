import { useEffect, useMemo, useState } from "react";
import {
  listUsersAdmin,
  getUserAdminById,
  updateUserAdmin,
  deleteUserAdmin,
} from "../api/admin";

import AppLayout from "@/components/layout/AppLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import MobileUserCard from "@/components/MobileUserCard";
import UserViewDialog from "@/components/UserViewDialog";
import UserEditDialog from "@/components/UserEditDialog";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const fmt = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const [activeUser, setActiveUser] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
  });

  /* ================= FETCH USERS ================= */
  const reload = async () => {
    setLoading(true);
    try {
      const data = await listUsersAdmin();
      setUsers(data);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return users;
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(x) ||
        (u.email || "").toLowerCase().includes(x) ||
        (u.phone || "").toLowerCase().includes(x)
    );
  }, [q, users]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const openView = async (id) => {
    setViewOpen(true);
    setActiveUser(null);

    try {
      const fullUser = await getUserAdminById(id);
      console.log("FULL USER FROM API:", fullUser);
      setActiveUser(fullUser);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load user");
      setViewOpen(false);
    }
  };


  const openEdit = async (id) => {
    try {
      const u = await getUserAdminById(id);
      setActiveUser(u);
      setForm({
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || u.mobile || "",
        dob: u.dob ? new Date(u.dob) : null,
      });
      setEditOpen(true);
    } catch {
      toast.error("Failed to load user");
    }
  };

  const saveUser = async () => {
    if (!activeUser?._id) return;
    setSaving(true);
    try {
      const updated = await updateUserAdmin(activeUser._id, {
        ...form,
        dob: form.dob ? form.dob.toISOString() : null,
      });

      setUsers((prev) =>
        prev.map((u) => (u._id === activeUser._id ? { ...u, ...updated } : u))
      );

      toast.success("User updated");
      setEditOpen(false);
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    setDeleting(true);
    try {
      await deleteUserAdmin(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success("User deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="w-full md:max-w-6xl space-y-5">

        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start gap-3 md:items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <Input
              className="w-full md:w-64"
              placeholder="Search name, email, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">
                Loading users…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              <>
                {/* ===== MOBILE VIEW ===== */}
                <div className="space-y-4 md:hidden">
                  {paginatedUsers.map((u) => (
                    <MobileUserCard
                      key={u._id}
                      user={u}
                      onView={() => openView(u._id)}
                      onEdit={() => openEdit(u._id)}
                      onDelete={() => removeUser(u._id)}
                      onBookings={() => navigate(`/bookings?user=${u._id}`)}
                    />
                  ))}
                </div>


                {/* ===== DESKTOP VIEW ===== */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-muted-foreground border-b">
                      <tr>
                        <th className="py-3 pr-4 text-left">Name</th>
                        <th className="py-3 pr-4 text-left">Email</th>
                        <th className="py-3 pr-4 text-left">Phone</th>
                        <th className="py-3 pr-4 text-left">DOB</th>
                        <th className="py-3 pr-4 text-left">Created</th>
                        <th className="py-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>


                    <tbody>
                      {paginatedUsers.map((u) => (
                        <tr
                          key={u._id}
                          onClick={() => openView(u._id)}
                          className="
        border-b last:border-0
        cursor-pointer
        hover:bg-muted/40
        transition
      "
                        >
                          <td className="py-3 pr-4 font-medium">{u.name || "—"}</td>
                          <td className="py-3 pr-4">{u.email || "—"}</td>
                          <td className="py-3 pr-4">{u.phone || u.mobile || "—"}</td>
                          <td className="py-3 pr-4">{fmt(u.dob)}</td>
                          <td className="py-3 pr-4">{fmt(u.createdAt)}</td>

                          {/* ACTIONS — stop row click */}
                          <td
                            className="py-3 pr-2 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent className="bg-white" align="end">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openView(u._id)}>
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(u._id)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer"
                                  onClick={() => navigate(`/bookings?user=${u._id}`)}
                                >
                                  See all bookings
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => removeUser(u._id)}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
              </>
            )}
          </CardContent>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + paginatedUsers.length} of {total}
              </span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

        </Card>

      </div>

      <UserViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        user={activeUser}
      />


      <UserEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={activeUser}
        onSave={async (data) => {
          if (!activeUser?._id) return;

          setSaving(true);
          try {
            const updated = await updateUserAdmin(activeUser._id, {
              ...data,
              dob: data.dob ? data.dob.toISOString() : null,
            });

            setUsers((prev) =>
              prev.map((u) =>
                u._id === activeUser._id ? { ...u, ...updated } : u
              )
            );

            toast.success("User updated");
            setEditOpen(false);
          } catch {
            toast.error("Update failed");
          } finally {
            setSaving(false);
          }
        }}
      />

    </AppLayout>
  );
}

/* ================= SMALL UI HELPERS ================= */
function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
