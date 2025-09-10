// admin/src/pages/RoomsNew.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createRoom, getRoomAdmin, updateRoom, deleteRoom } from "../api/admin";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function Chip({ text, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
      {text}
      <button type="button" className="opacity-70 hover:opacity-100" onClick={onRemove}>✕</button>
    </span>
  );
}

export default function RoomsNew() {
  const [loading, setLoading] = useState(false);
  const [sp] = useSearchParams();
  const id = sp.get("id");                // <- edit mode if present
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [priceWithMeal, setPriceWithMeal] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const [galleryText, setGalleryText] = useState("");
  const galleryList = galleryText.split("\n").map(s => s.trim()).filter(Boolean);

  const [description, setDescription] = useState("");

  const [services, setServices] = useState([]);
  const [serviceInput, setServiceInput] = useState("");

  const [accoms, setAccoms] = useState([]);
  const [accomInput, setAccomInput] = useState("");

  // Load existing room in edit mode
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const r = await getRoomAdmin(id);
        setName(r.name || "");
        setPricePerNight(String(r.pricePerNight ?? ""));
        setPriceWithMeal(String(r.priceWithMeal ?? ""));
        setCoverImage(r.coverImage || "");
        setGalleryText((r.galleryImages || []).join("\n"));
        setDescription(r.description || "");
        setServices(r.roomServices || []);
        setAccoms(r.accommodation || []);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load room");
      }
    })();
  }, [id, isEdit]);

  const addService = () => {
    const v = serviceInput.trim();
    if (!v) return;
    setServices(arr => (arr.includes(v) ? arr : [...arr, v]));
    setServiceInput("");
  };
  const removeService = (v) => setServices(arr => arr.filter(x => x !== v));

  const addAccom = () => {
    const v = accomInput.trim();
    if (!v) return;
    setAccoms(arr => (arr.includes(v) ? arr : [...arr, v]));
    setAccomInput("");
  };
  const removeAccom = (v) => setAccoms(arr => arr.filter(x => x !== v));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!name.trim()) return toast.error("Room name is required");
    if (pricePerNight === "" || isNaN(Number(pricePerNight))) {
      return toast.error("Enter a valid price per night");
    }

    const payload = {
      name: name.trim(),
      pricePerNight: Number(pricePerNight) || 0,
      priceWithMeal: Number(priceWithMeal) || 0,
      coverImage,
      galleryImages: galleryList,
      description,
      roomServices: services,
      accommodation: accoms,
    };

    setLoading(true);
    try {
      if (isEdit) {
        await toast.promise(updateRoom(id, payload), {
          loading: "Updating room...",
          success: "Room updated",
          error: (err) => err?.response?.data?.message || err.message || "Failed to update room",
        });
      } else {
        await toast.promise(createRoom(payload), {
          loading: "Creating room...",
          success: "Room created",
          error: (err) => err?.response?.data?.message || err.message || "Failed to create room",
        });
        // reset after create
        setName(""); setPricePerNight(""); setPriceWithMeal("");
        setCoverImage(""); setGalleryText(""); setDescription("");
        setServices([]); setServiceInput(""); setAccoms([]); setAccomInput("");
      }
    } finally {
      setLoading(false);
    }
  };

  const onServiceKey = (e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } };
  const onAccomKey = (e) => { if (e.key === "Enter") { e.preventDefault(); addAccom(); } };

  const onDeleteHere = async () => {
    if (!isEdit) return;
    if (!confirm("Delete this room?")) return;
    try {
      await toast.promise(deleteRoom(id), {
        loading: "Deleting room...",
        success: "Room deleted",
        error: (err) => err?.response?.data?.message || "Delete failed",
      });
      // you can navigate back to dashboard if desired
      // navigate("/dashboard");
    } catch { }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">
          {isEdit ? "Edit Room" : "Create Room"}
        </h1>
        {isEdit && (
          <Button
            onClick={onDeleteHere}
            className="w-full sm:w-auto"
          >
            Delete room
          </Button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Room name */}
        <div className="md:col-span-1">
          <Label>Room name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Grand Repose"
            className="mt-2"
          />
        </div>

        {/* Pricing (2 cols on sm+) */}
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Price per night (₹)</Label>
              <Input
                type="number"
                min="0"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Price with meal (₹)</Label>
              <Input
                type="number"
                min="0"
                value={priceWithMeal}
                onChange={(e) => setPriceWithMeal(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Services + Accommodation (side-by-side on md+) */}
        <div className="md:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Room services */}
            <div>
              <Label>Room services</Label>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <Input
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={onServiceKey}
                  placeholder="Type a service and press Enter"
                  className="w-full"
                />
                <Button
                  type="button"
                  onClick={addService}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {services.map((s) => (
                  <Chip key={s} text={s} onRemove={() => removeService(s)} />
                ))}
              </div>
            </div>

            {/* Accommodation */}
            <div>
              <Label>Accommodation</Label>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <Input
                  value={accomInput}
                  onChange={(e) => setAccomInput(e.target.value)}
                  onKeyDown={onAccomKey}
                  placeholder="Type an accommodation and press Enter"
                  className="w-full"
                />
                <Button
                  type="button"
                  onClick={addAccom}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {accoms.map((a) => (
                  <Chip key={a} text={a} onRemove={() => removeAccom(a)} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cover image */}
        <div className="md:col-span-3">
          <Label>Cover image URL</Label>
          <Input
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://..."
            className="mt-2"
          />
        </div>

        {/* Gallery + Description (side-by-side on md+) */}
        <div className="md:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Gallery images (one URL per line)</Label>
              <Textarea
                rows={4}
                value={galleryText}
                onChange={(e) => setGalleryText(e.target.value)}
                placeholder={"https://...\nhttps://...\nhttps://..."}
                className="mt-2"
              />
              {galleryList.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {galleryList.length} links detected
                </p>
              )}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the room, view, amenities…"
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="md:col-span-3">
          <Button disabled={loading} type="submit" className="w-full mt-2">
            {loading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Room"
                : "Create Room"}
          </Button>
        </div>
      </form>
    </div>
  );

}
