import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Star } from "lucide-react";
import { amenityCategories } from "@/data/aminities";

/* ======================================================
   MOBILE ROOM FORM – WITH PROGRESS + REVIEWS
====================================================== */

export default function MobileRoomForm({
  /* BASIC */
  name, setName,
  pricePerNight, setPricePerNight,
  description, setDescription,

  /* MEALS */
  mealPriceVeg, setMealPriceVeg,
  mealPriceNonVeg, setMealPriceNonVeg,
  mealPriceCombo, setMealPriceCombo,

  /* IMAGES */
  setCoverFile,
  setGalleryFiles,

  /* AMENITIES */
  amenities,
  toggleAmenity,

  /* HOUSE RULES */
  houseRules,
  ruleInput,
  setRuleInput,
  addHouseRule,

  /* REVIEWS */
  reviews,
  reviewName, setReviewName,
  reviewRating, setReviewRating,
  reviewComment, setReviewComment,
  addReview,
  removeReview,

  /* FORM */
  uploading,
  isEdit,
}) {
  const [openAmenity, setOpenAmenity] = useState(null);

  /* ================= PROGRESS LOGIC ================= */
  const progress = useMemo(() => {
    let done = 0;
    const total = 6;

    if (name && pricePerNight) done++;
    if (mealPriceVeg || mealPriceNonVeg || mealPriceCombo) done++;
    if (amenities.length > 0) done++;
    if (houseRules.length > 0) done++;
    if (reviews.length > 0) done++;
    done++; // images optional but count as section

    return Math.round((done / total) * 100);
  }, [
    name,
    pricePerNight,
    mealPriceVeg,
    mealPriceNonVeg,
    mealPriceCombo,
    amenities,
    houseRules,
    reviews,
  ]);

  return (
    <div className="space-y-4 text-sm">

      {/* ================= PROGRESS BAR ================= */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Form Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ================= BASIC INFO ================= */}
      <Card title="Basic Information">
        <Field label="Room Name *">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Price per Night (₹) *">
          <Input type="number" value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} />
        </Field>

        <Field label="Description">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </Card>

      {/* ================= MEALS ================= */}
      <Card title="Meal Pricing">
        <InputField label="Veg Meal (₹)" value={mealPriceVeg} set={setMealPriceVeg} />
        <InputField label="Non-Veg Meal (₹)" value={mealPriceNonVeg} set={setMealPriceNonVeg} />
        <InputField label="Combo Meal (₹)" value={mealPriceCombo} set={setMealPriceCombo} />
      </Card>

      {/* ================= IMAGES ================= */}
      <Card title="Images">
        <UploadBox label="Cover Image" onChange={(e) => setCoverFile(e.target.files?.[0])} />
        <UploadBox label="Gallery Images" multiple onChange={(e) => setGalleryFiles([...e.target.files])} />
      </Card>

      {/* ================= AMENITIES ================= */}
      <Card title="Amenities">
        {amenityCategories.map((cat) => {
          const open = openAmenity === cat.id;
          const selected = cat.items.filter(i => amenities.includes(i.id)).length;

          return (
            <div key={cat.id} className="border-b last:border-0">
              <button
                type="button"
                onClick={() => setOpenAmenity(open ? null : cat.id)}
                className="w-full flex justify-between py-3"
              >
                <span>{cat.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({selected} selected)
                </span>
              </button>

              {open && (
                <div className="grid grid-cols-2 gap-2 pb-3">
                  {cat.items.map(item => {
                    const active = amenities.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleAmenity(item.id)}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${active ? "bg-primary border-primary" : ""}`}>
                          {active && <span className="h-2 w-2 bg-white rounded-full" />}
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* ================= HOUSE RULES ================= */}
      <Card title="House Rules">
        <div className="flex gap-2">
          <Input value={ruleInput} onChange={(e) => setRuleInput(e.target.value)} />
          <Button size="sm" variant="outline" onClick={addHouseRule}>Add</Button>
        </div>

        {houseRules.map((r, i) => (
          <div key={i} className="border rounded px-2 py-1 text-xs mt-1">{r}</div>
        ))}
      </Card>

      {/* ================= REVIEWS ================= */}
      <Card title="Guest Reviews">
        <Input placeholder="Guest name" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
        <Input type="number" min="1" max="5" value={reviewRating} onChange={(e) => setReviewRating(e.target.value)} />
        <Input placeholder="Comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />

        <Button size="sm" variant="outline" onClick={addReview}>Add Review</Button>

        {reviews.map((r, i) => (
          <div key={i} className="border rounded p-2 text-xs">
            <div className="font-medium">{r.name}</div>
            <div className="text-yellow-500 flex">
              {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
            </div>
            {r.comment && <div className="text-muted-foreground">{r.comment}</div>}
            <button onClick={() => removeReview(i)} className="text-red-500 text-xs mt-1">Remove</button>
          </div>
        ))}
      </Card>

      {/* ================= SUBMIT ================= */}
      <Button type="submit" disabled={uploading} className="w-full">
        {isEdit ? "Update Room" : "Create Room"}
      </Button>
    </div>
  );
}

/* ================= UI HELPERS ================= */

function Card({ title, children }) {
  return (
    <div className="bg-card border rounded-xl p-3 space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function InputField({ label, value, set }) {
  return (
    <Field label={label}>
      <Input type="number" value={value} onChange={(e) => set(e.target.value)} />
    </Field>
  );
}

function UploadBox({ label, ...props }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <label className="border-dashed border rounded-lg h-24 flex flex-col items-center justify-center cursor-pointer">
        <Upload size={16} />
        <span className="text-xs text-muted-foreground">Upload</span>
        <input type="file" hidden {...props} />
      </label>
    </div>
  );
}
