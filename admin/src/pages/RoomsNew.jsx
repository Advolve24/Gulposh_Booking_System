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
import  MultiSelectDropdown  from "../components/MultiSelectDropdown";

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

export const SERVICE_OPTIONS = [
  "Wifi",
  "AC",
  "Parking",
  "Pool",
  "TV",
  "Breakfast",
  "Heater",
  "Kitchen",
  "Balcony",
  "Mountain View",
  "Sea View",
  "Garden View",
];
export const ACCOM_OPTIONS = [
  "2 Guests",
  "3 Guests",
  "4 Guests",
  "5 Guests",
  "6 Guests",
  "Double Bed",
  "Queen Bed",
  "King Bed",
  "Private Bathroom",
  "1 BHK Villa",
  "2 BHK Villa",
  "3 BHK Villa",
];




export default function RoomsNew() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [sp] = useSearchParams();
  const id = sp.get("id");
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [priceWithMeal, setPriceWithMeal] = useState("");
  const [description, setDescription] = useState("");

  const [coverImage, setCoverImage] = useState("");
  const [coverFile, setCoverFile] = useState(null);

  const [galleryUrls, setGalleryUrls] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const [services, setServices] = useState([]);
  const [serviceInput, setServiceInput] = useState("");

  const [accoms, setAccoms] = useState([]);
  const [accomInput, setAccomInput] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const r = await getRoomAdmin(id);
        setName(r.name || "");
        setPricePerNight(String(r.pricePerNight ?? ""));
        setPriceWithMeal(String(r.priceWithMeal ?? ""));
        setDescription(r.description || "");
        setServices(r.roomServices || []);
        setAccoms(r.accommodation || []);
        setCoverImage(r.coverImage || "");
        setGalleryUrls((r.galleryImages || []).filter(Boolean));
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load room");
      }
    })();
  }, [id, isEdit]);

  const addService = () => {
    const v = serviceInput.trim();
    if (!v) return;
    setServices((arr) => (arr.includes(v) ? arr : [...arr, v]));
    setServiceInput("");
  };
  const removeService = (v) => setServices((arr) => arr.filter((x) => x !== v));

  const addAccom = () => {
    const v = accomInput.trim();
    if (!v) return;
    setAccoms((arr) => (arr.includes(v) ? arr : [...arr, v]));
    setAccomInput("");
  };
  const removeAccom = (v) => setAccoms((arr) => arr.filter((x) => x !== v));

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

  const removeGalleryUrl = (url) => setGalleryUrls((arr) => arr.filter((u) => u !== url));
  const removeGalleryFile = (file) =>
    setGalleryFiles((arr) => arr.filter((f) => f !== file));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading || uploading) return;

    if (!name.trim()) return toast.error("Room name is required");
    if (pricePerNight === "" || isNaN(Number(pricePerNight))) {
      return toast.error("Enter a valid price per night");
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
        pricePerNight: Number(pricePerNight) || 0,
        priceWithMeal: Number(priceWithMeal) || 0,
        coverImage: coverUrl || "",
        galleryImages: [...galleryUrls, ...newGalleryUrls],
        description,
        roomServices: services,
        accommodation: accoms,
      };

      setUploading(false);
      setLoading(true);

      if (isEdit) {
        await toast.promise(updateRoom(id, payload), {
          loading: "Updating room...",
          success: "Room updated",
          error: (err) =>
            err?.response?.data?.message || err.message || "Failed to update room",
        });
      } else {
        await toast.promise(createRoom(payload), {
          loading: "Creating room...",
          success: "Room created",
          error: (err) =>
            err?.response?.data?.message || err.message || "Failed to create room",
        });

        setName("");
        setPricePerNight("");
        setPriceWithMeal("");
        setDescription("");
        setServices([]);
        setServiceInput("");
        setAccoms([]);
        setAccomInput("");
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

  const onServiceKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addService();
    }
  };
  const onAccomKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAccom();
    }
  };

  const onDeleteHere = async () => {
    if (!isEdit) return;
    if (!confirm("Delete this room?")) return;
    try {
      await toast.promise(deleteRoom(id), {
        loading: "Deleting room...",
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

        {/* Pricing */}
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

        {/* Cover image upload */}
        <div className="md:flex justify-between md:col-span-3">
          <div className="md:w-[49%]">
            <Label>Cover image</Label>
            <div className="mt-2 flex flex-col sm:flex-row items-start gap-4">
              <Input type="file" accept="image/*" onChange={onCoverPick} className="" />
              {(coverFile || coverImage) && (
                <img
                  src={coverFile ? URL.createObjectURL(coverFile) : coverImage}
                  alt="Cover preview"
                  className="h-24 w-40 object-cover rounded"
                />
              )}
              {(coverFile || coverImage) && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverImage("");
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Gallery upload */}
          <div className="md:w-[49%]">
            <Label>Gallery images</Label>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={onGalleryPick}
              className="mt-2"
            />
            {/* Existing gallery URLs */}
            {galleryUrls.length > 0 && (
              <div className="mt-3">
                <div className="text-sm mb-2">Existing images</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {galleryUrls.map((url) => (
                    <div key={url} className="relative group">
                      <img src={url} alt="" className="h-24 w-full object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => removeGalleryUrl(url)}
                        className="absolute top-1 right-1 rounded bg-black/60 text-white text-xs px-1.5 py-0.5 opacity-0 group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Newly selected files */}
          {galleryFiles.length > 0 && (
            <div className="mt-3">
              <div className="text-sm mb-2">New images to upload</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {galleryFiles.map((file) => (
                  <div key={file.name + file.size} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="h-24 w-full object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryFile(file)}
                      className="absolute top-1 right-1 rounded bg-black/60 text-white text-xs px-1.5 py-0.5 opacity-0 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Services & Accommodation */}
        <div className="md:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div>
                <MultiSelectDropdown
                  label="Room Services"
                  options={SERVICE_OPTIONS}
                  selected={services}
                  onSelect={(opt) => {
                    setServices((prev) =>
                      prev.includes(opt)
                        ? prev.filter((x) => x !== opt)
                        : [...prev, opt]
                    );
                  }}
                />

                <div className="flex flex-wrap gap-2 mt-3">
                  {services.map((s) => (
                    <Chip key={s} text={s} onRemove={() => removeService(s)} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div>
                <MultiSelectDropdown
                  label="Accommodation"
                  options={ACCOM_OPTIONS}
                  selected={accoms}
                  onSelect={(opt) => {
                    setAccoms((prev) =>
                      prev.includes(opt)
                        ? prev.filter((x) => x !== opt)
                        : [...prev, opt]
                    );
                  }}
                />

                <div className="flex flex-wrap gap-2 mt-3">
                  {accoms.map((a) => (
                    <Chip key={a} text={a} onRemove={() => removeAccom(a)} />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Description */}
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

        {/* Submit */}
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
