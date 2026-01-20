import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "sonner";
import { listRooms, deleteRoom } from "@/api/admin";
import {
  Eye,
  Pencil,
  MoreVertical,
  Plus,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("grid"); // grid | list

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const data = await listRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load rooms", err);
    } finally {
      setLoading(false);
    }
  };

  //delete
  const handleDeleteRoom = async (roomId) => {
    if (!roomId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this room?\nThis action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deleteRoom(roomId);
      toast.success("Room deleted successfully");
      fetchRooms();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to delete room"
      );
    }
  };

  /* ================= FILTERING ================= */
  const filteredRooms = rooms.filter((room) => {
    // ❌ REMOVE ENTIRE VILLA FROM ROOMS PAGE
    if (room.isVilla) return false;

    const matchesSearch = room.name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || statusFilter === "available";

    return matchesSearch && matchesStatus;
  });



  return (
    <AppLayout>
      <div className="space-y-6 w-full py-0">
        {/* ================= TOOLBAR ================= */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* LEFT */}
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search rooms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className=" h-10 w-full sm:w-64 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="
                                        h-10 w-full sm:w-40
                                        bg-card
                                        border border-border
                                        rounded-lg
                                        text-sm
                                        focus:ring-1 focus:ring-primary
                                        "
              >
                <SelectValue placeholder="All Status" />
              </SelectTrigger>

              <SelectContent
                className="bg-card border border-border rounded-lg shadow-md"
              >
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
              </SelectContent>
            </Select>

          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3 justify-end">
            {/* VIEW TOGGLE */}
            <div className="hidden sm:flex items-center gap-1 rounded-lg border p-1">
              <button
                onClick={() => setView("grid")}
                className={`p-2 rounded-md ${view === "grid" ? "bg-muted" : "hover:bg-muted"
                  }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-md ${view === "list" ? "bg-muted" : "hover:bg-muted"
                  }`}
              >
                <List size={16} />
              </button>
            </div>

            {/* ADD ROOM */}
            <Link
              to="/rooms/new"
              className="inline-flex w-full md:w-auto items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Plus size={16} />
              Add Room
            </Link>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading rooms…
          </p>
        ) : filteredRooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rooms found.
          </p>
        ) : (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                : "flex flex-col gap-4"
            }
          >
            {filteredRooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                view={view}
                onDelete={handleDeleteRoom}   // ✅ PASS FUNCTION
              />
            ))}

          </div>
        )}
      </div>
    </AppLayout>
  );
}


function RoomCard({ room, view, onDelete }) {
  const name = room.name || "Room";

  const image =
    room.coverImage ||
    room.galleryImages?.[0] ||
    "https://via.placeholder.com/600x400?text=No+Image";

  return (
    <div
      className={`group bg-card border rounded-xl shadow-sm hover:shadow-md transition
        ${view === "list" ? "flex gap-4 p-4" : "overflow-hidden"}
      `}
    >
      {/* IMAGE */}
      <div
        className={`relative bg-muted overflow-hidden
          ${view === "list" ? "h-32 w-48 rounded-lg shrink-0" : "h-52"}
        `}
      >
        <Link
          to={`/rooms/view/${room._id}`}
          className={`relative bg-muted overflow-hidden block
    ${view === "list" ? "h-32 w-48 rounded-lg shrink-0" : "h-52"}
  `}
        >
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />

          {/* STATUS */}
          <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-green-200 text-green-700">
            available
          </span>

          {/* DESKTOP HOVER ACTIONS */}
          {view === "grid" && (
            <div
              className="
              absolute inset-0 hidden lg:flex
              items-end justify-center gap-3
              bg-black/25
              opacity-0 group-hover:opacity-100
              transition pb-4
            "
            >
              <Link
                to={`/rooms/view/${room._id}`}
                className="
                w-[40%] flex items-center justify-center gap-2
                rounded-lg px-4 py-2 text-sm font-medium
                bg-white/70 backdrop-blur-md
                border border-white/40 shadow-sm
                hover:bg-white/90 transition
              "
              >
                <Eye size={14} /> View
              </Link>

              <Link
                to={`/rooms/new?id=${room._id}`}
                className="
                w-[40%] flex items-center justify-center gap-2
                rounded-lg px-4 py-2 text-sm font-medium
                bg-white/70 backdrop-blur-md
                border border-white/40 shadow-sm
                hover:bg-white/90 transition
              "
              >
                <Pencil size={14} /> Edit
              </Link>
            </div>
          )}
        </Link>
      </div>

      {/* CONTENT */}
      <div className={`${view === "list" ? "flex-1" : "p-4"} space-y-2`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[17px] font-medium tracking-tight leading-snug">
            {name}
          </h3>

          {/* THREE DOTS MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-md hover:bg-muted">
                <MoreVertical size={18} className="text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-44 bg-card border border-border rounded-lg shadow-lg"
            >
              <DropdownMenuItem asChild>
                <Link
                  to={`/rooms/view/${room._id}`}
                  className="flex items-center gap-2"
                >
                  <Eye size={14} /> View Details
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  to={`/rooms/new?id=${room._id}`}
                  className="flex items-center gap-2"
                >
                  <Pencil size={14} /> Edit Room
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center gap-2 text-red-600 focus:text-red-600"
                onClick={() => onDelete(room._id)}
              >
                <Trash2 size={14} />
                Delete Room
              </DropdownMenuItem>


            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* PRICE */}
        <p className="text-sm">
          <span className="font-semibold text-primary tabular-nums">
            ₹ {room.pricePerNight ?? "—"}
          </span>
          <span className="text-muted-foreground"> / night</span>
        </p>

        {/* MEALS */}
        <div className="flex flex-wrap gap-2 pt-1">
          {room.mealPriceVeg > 0 && (
            <span className="px-2 py-1 rounded-full bg-muted text-xs">
              Veg: ₹{room.mealPriceVeg}
            </span>
          )}
          {room.mealPriceNonVeg > 0 && (
            <span className="px-2 py-1 rounded-full bg-muted text-xs">
              Non-Veg: ₹{room.mealPriceNonVeg}
            </span>
          )}
        </div>

        {/* MOBILE / LIST QUICK ACTIONS */}
        <div className="flex gap-2 pt-3 lg:hidden">
          <Link
            to={`/rooms/view/${room._id}`}
            className="w-full flex border rounded-md py-2 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-white/70 hover:bg-white/90"
          >
            <Eye size={14} /> View
          </Link>
          <Link
            to={`/rooms/new?id=${room._id}`}
            className="w-full flex items-center border rounded-md py-2  justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-white/70 hover:bg-white/90"
          >
            <Pencil size={14} /> Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
