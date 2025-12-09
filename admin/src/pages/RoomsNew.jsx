import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createRoom,
  getRoomAdmin,
  updateRoom,
  deleteRoom,
  uploadImage,
  uploadImages,
} from "../api/admin";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { amenityCategories } from "../data/aminities";

function Chip({ text, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
      {text}
      <button type="button" className="opacity-70 hover:opacity-100" onClick={onRemove}>
        ✕
      </button>
    </span>
  );
}

export default function RoomsNew() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [sp] = useSearchParams();
  const id = sp.get("id");
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [mealPriceVeg, setMealPriceVeg] = useState("");
  const [mealPriceNonVeg, setMealPriceNonVeg] = useState("");
  const [mealPriceCombo, setMealPriceCombo] = useState("");
  const [description, setDescription] = useState("");

  const [openCat, setOpenCat] = useState(null);


  const [coverImage, setCoverImage] = useState("");
  const [coverFile, setCoverFile] = useState(null);

  const [galleryUrls, setGalleryUrls] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);

  // NEW: single amenities array
  const [amenities, setAmenities] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const r = await getRoomAdmin(id);

        setName(r.name || "");
        setPricePerNight(String(r.pricePerNight ?? ""));
        setMealPriceVeg(String(r.mealPriceVeg ?? ""));
        setMealPriceNonVeg(String(r.mealPriceNonVeg ?? ""));
        setMealPriceCombo(String(r.mealPriceCombo ?? ""));
        setDescription(r.description || "");

        setAmenities(r.amenities || []); // <-- NEW

        setCoverImage(r.coverImage || "");
        setGalleryUrls((r.galleryImages || []).filter(Boolean));
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load room");
      }
    })();
  }, [id, isEdit]);

  const onCoverPick = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setCoverFile(f);
      setCoverImage("");
    }
  };

  const onGalleryPick = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setGalleryFiles((prev) => [...prev, ...files]);
  };

  const removeGalleryUrl = (url) =>
    setGalleryUrls((arr) => arr.filter((u) => u !== url));

  const removeGalleryFile = (file) =>
    setGalleryFiles((arr) => arr.filter((f) => f !== file));

  // ADD / REMOVE amenities
  const toggleAmenity = (id) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading || uploading) return;

    if (!name.trim()) return toast.error("Room name is required");
    if (!pricePerNight || isNaN(Number(pricePerNight))) {
      return toast.error("Enter valid price per night");
    }

    try {
      setUploading(true);

      let coverUrl = coverImage;
      if (coverFile instanceof File) {
        coverUrl = await uploadImage(coverFile);
      }

      let newGalleryUrls = [];
      if (galleryFiles.length > 0) {
        newGalleryUrls = await uploadImages(galleryFiles);
      }

      const payload = {
        name: name.trim(),
        pricePerNight: Number(pricePerNight),
        mealPriceVeg: Number(mealPriceVeg) || 0,
        mealPriceNonVeg: Number(mealPriceNonVeg) || 0,
        mealPriceCombo: Number(mealPriceCombo) || 0,
        coverImage: coverUrl,
        galleryImages: [...galleryUrls, ...newGalleryUrls],
        description,
        amenities, // <-- NEW FIELD
      };

      setUploading(false);
      setLoading(true);

      if (isEdit) {
        await toast.promise(updateRoom(id, payload), {
          loading: "Updating...",
          success: "Room updated",
          error: (err) => err?.response?.data?.message || "Update failed",
        });
      } else {
        await toast.promise(createRoom(payload), {
          loading: "Creating...",
          success: "Room created",
          error: (err) => err?.response?.data?.message || "Create failed",
        });

        setName("");
        setPricePerNight("");
        setMealPriceVeg("");
        setMealPriceNonVeg("");
        setMealPriceCombo("");
        setDescription("");
        setAmenities([]);
        setCoverImage("");
        setCoverFile(null);
        setGalleryUrls([]);
        setGalleryFiles([]);
      }
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const onDeleteHere = async () => {
    if (!isEdit) return;
    if (!confirm("Delete this room?")) return;
    try {
      await toast.promise(deleteRoom(id), {
        loading: "Deleting...",
        success: "Room deleted",
        error: (err) => err?.response?.data?.message || "Delete failed",
      });
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
          <Button onClick={onDeleteHere} className="w-full sm:w-auto">
            Delete room
          </Button>
        )}
      </div>

      {/* FORM */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Room name */}
        <div>
          <Label>Room name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Grand Repose"
            className="mt-2"
          />
        </div>

        {/* Prices */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            <Label>Veg Meal Price (₹ per guest)</Label>
            <Input
              type="number"
              min="0"
              value={mealPriceVeg}
              onChange={(e) => setMealPriceVeg(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Non-Veg Meal Price (₹ per guest)</Label>
            <Input
              type="number"
              min="0"
              value={mealPriceNonVeg}
              onChange={(e) => setMealPriceNonVeg(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Combo Meal Price (₹ per guest)</Label>
            <Input
              type="number"
              min="0"
              value={mealPriceCombo}
              onChange={(e) => setMealPriceCombo(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        {/* IMAGES */}
        <div className="md:flex justify-between md:col-span-3">
          <div className="md:w-[49%]">
            <Label>Cover image</Label>
            <div className="mt-2 flex items-start gap-4">
              <Input type="file" accept="image/*" onChange={onCoverPick} />
              {(coverFile || coverImage) && (
                <img
                  src={coverFile ? URL.createObjectURL(coverFile) : coverImage}
                  className="h-24 w-40 object-cover rounded"
                />
              )}
            </div>
          </div>

          <div className="md:w-[49%]">
            <Label>Gallery images</Label>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={onGalleryPick}
              className="mt-2"
            />

            {/* Existing Images */}
            {galleryUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {galleryUrls.map((url) => (
                  <div key={url} className="relative group">
                    <img src={url} className="h-24 w-full object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removeGalleryUrl(url)}
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Images */}
            {galleryFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {galleryFiles.map((file) => (
                  <div key={file.name} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      className="h-24 w-full object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryFile(file)}
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AMENITIES SECTION */}
        <div className="md:col-span-3 bg-gray-50 p-4 rounded border space-y-4">
          <Label className="text-base font-semibold">Amenities</Label>

          {/* GRID: 2 PER ROW ON DESKTOP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {amenityCategories.map((cat) => {
              const isOpen = openCat === cat.id;

              return (
                <div className="relative">
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
                    className="w-full flex items-center justify-between px-4 py-3 border rounded bg-white"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <cat.icon className="h-4 w-4" />
                      {cat.label}
                    </div>

                    <span className="text-gray-500">{openCat === cat.id ? "▲" : "▼"}</span>
                  </button>

                  {/* DROPDOWN (does NOT push layout) */}
                  {openCat === cat.id && (
                    <div className="absolute left-0 right-0 z-50 bg-white border mt-1 p-3 rounded shadow-lg">
                      <div className="grid grid-cols-2 gap-2">
                        {cat.items.map((item) => {
                          const selected = amenities.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`flex items-center gap-2 border rounded px-3 py-2 text-sm ${selected ? "bg-green-100 border-green-500" : "bg-white"
                                }`}
                              onClick={() => toggleAmenity(item.id)}
                            >
                              <item.icon className="h-4 w-4" />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              );
            })}
          </div>

          {/* Selected Chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {amenities.map((id) => {
              const item = amenityCategories
                .flatMap((c) => c.items)
                .find((i) => i.id === id);

              if (!item) return null;

              return (
                <Chip key={id} text={item.label} onRemove={() => toggleAmenity(id)} />
              );
            })}
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="md:col-span-3">
          <Label>Description</Label>
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the room, view, amenities…"
            className="mt-2"
          />
        </div>

        {/* SUBMIT */}
        <div className="md:col-span-3">
          <Button disabled={loading || uploading} type="submit" className="w-full mt-2">
            {uploading
              ? "Uploading images…"
              : loading
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
