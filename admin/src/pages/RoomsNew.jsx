import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { createRoom, getRoomAdmin, updateRoom, uploadImage, uploadImages, } from "@/api/admin";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Upload } from "lucide-react";
import { amenityCategories } from "@/data/aminities";

/* ====================================================== */

const STEPS = [
  { key: "basic", label: "Basic" },
  { key: "meals", label: "Meals" },
  { key: "images", label: "Images" },
  { key: "amenities", label: "Amenities" },
  { key: "rules", label: "Rules" },
  { key: "reviews", label: "Reviews" },
];

export default function RoomsNew() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const id = sp.get("id");
  const isEdit = Boolean(id);


  /* ---------------- FORM STATE ---------------- */
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [mealMode, setMealMode] = useState("");
  const [mealPriceVeg, setMealPriceVeg] = useState("");
  const [mealPriceNonVeg, setMealPriceNonVeg] = useState("");
  const [mealPriceCombo, setMealPriceCombo] = useState("");
  const [description, setDescription] = useState("");

  const [coverImage, setCoverImage] = useState("");
  const [coverFile, setCoverFile] = useState(null);

  const [galleryUrls, setGalleryUrls] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const [amenities, setAmenities] = useState([]);
  const [openCat, setOpenCat] = useState(null);

  const [houseRules, setHouseRules] = useState([]);
  const [ruleInput, setRuleInput] = useState("");
  const [maxGuests, setMaxGuests] = useState("");

  /* ---------------- REVIEWS ---------------- */
  const [reviews, setReviews] = useState([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");

  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");

  const [step, setStep] = useState(0);

  const [completedSteps, setCompletedSteps] = useState({
    basic: false,
    meals: false,
    images: false,
    amenities: false,
    rules: false,
    reviews: false,
    submit: false,
  });



  /* ---------------- EDIT LOAD ---------------- */
  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        setLoading(true);
        const r = await getRoomAdmin(id);

        setName(r.name || "");
        setPricePerNight(String(r.pricePerNight ?? ""));
        setMaxGuests(String(r.maxGuests ?? ""));
        setMealMode(r.mealMode || "");
        setMealPriceVeg(String(r.mealPriceVeg ?? ""));
        setMealPriceNonVeg(String(r.mealPriceNonVeg ?? ""));
        setDescription(r.description || "");

        setAmenities(r.amenities || []);
        setHouseRules(r.houseRules || []);
        setReviews(r.reviews || []);

        setDiscountType(r.discountType || "none");
        setDiscountValue(String(r.discountValue ?? ""));
        setDiscountLabel(r.discountLabel || "");

        setCoverImage(r.coverImage || "");
        setGalleryUrls(r.galleryImages || []);
      } catch {
        toast.error("Failed to load room");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  /* ---------------- HELPERS ---------------- */
  const toggleAmenity = (id) => {
    setAmenities((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );
  };

  const addHouseRule = () => {
    const v = ruleInput.trim();
    if (!v) return;
    if (houseRules.includes(v)) return;
    setHouseRules((p) => [...p, v]);
    setRuleInput("");
  };

  const removeHouseRule = (rule) => {
    setHouseRules((p) => p.filter((r) => r !== rule));
  };

  const addReview = () => {
    const rating = Number(reviewRating);
    if (!reviewName.trim()) return toast.error("Guest name required");
    if (!rating || rating < 1 || rating > 5)
      return toast.error("Rating must be 1–5");

    setReviews((p) => [
      ...p,
      {
        name: reviewName.trim(),
        rating,
        comment: reviewComment.trim(),
      },
    ]);

    setReviewName("");
    setReviewRating("5");
    setReviewComment("");
  };

  const removeReview = (index) => {
    setReviews((p) => p.filter((_, i) => i !== index));
  };

  const STEP_VALIDATORS = [
    // 0️⃣ Basic
    ({ name, pricePerNight }) =>
      name.trim().length > 2 && Number(pricePerNight) > 0,

    // 1️⃣ Meals
    ({ mealPriceVeg, mealPriceNonVeg }) =>
      Number(mealPriceVeg) > 0 ||
      Number(mealPriceNonVeg) > 0 ||
      Number(mealPriceCombo) > 0,

    // 2️⃣ Images
    ({ coverImage, coverFile, galleryUrls, galleryFiles }) =>
      !!coverFile ||
      !!coverImage ||
      galleryFiles.length > 0 ||
      galleryUrls.length > 0,

    // 3️⃣ Amenities
    ({ amenities }) => amenities.length > 0,

    // 4️⃣ Rules
    ({ houseRules }) => houseRules.length > 0,

    // 5️⃣ Reviews (optional)
    () => true,
  ];


  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------- SUBMIT ---------------- */
  const onSubmit = async (e) => {
    e.preventDefault();

    // ⛔ ABSOLUTE SAFETY GUARD
    if (step !== STEPS.length - 1) return;

    if (uploading || loading) return;

    try {
      setUploading(true);

      let coverUrl = coverImage;
      if (coverFile) coverUrl = await uploadImage(coverFile);

      let newGallery = [];
      if (galleryFiles.length) newGallery = await uploadImages(galleryFiles);

      const payload = {
        name: name.trim(),
        pricePerNight: Number(pricePerNight),
        maxGuests: Number(maxGuests),
        mealMode,
        mealPriceVeg: mealMode === "price" ? Number(mealPriceVeg) : 0,
        mealPriceNonVeg: mealMode === "price" ? Number(mealPriceNonVeg) : 0,
        description,
        coverImage: coverUrl,
        galleryImages: [...galleryUrls, ...newGallery],
        amenities,
        houseRules,
        reviews,
        discountType,
        discountValue: discountType !== "none"
          ? Number(discountValue)
          : 0,
        discountLabel,
      };

      if (isEdit) {
        await updateRoom(id, payload);
        toast.success("Room updated");
      } else {
        await createRoom(payload);
        toast.success("Room created");
      }

      navigate("/rooms");
    } catch {
      toast.error("Failed to save room");
    } finally {
      setUploading(false);
    }
  };

  const isStepValid = (key) => {
    switch (key) {
      case "basic":
        return (
          name.trim().length > 2 &&
          Number(pricePerNight) > 0 &&
          Number(maxGuests) > 0
        );


      case "meals":
        return mealMode === "only" || mealMode === "price";

      case "images":
        return coverImage || coverFile;

      case "amenities":
        return amenities.length > 0;

      case "rules":
        return houseRules.length > 0;

      case "reviews":
        return reviews.length > 0;

      default:
        return false;
    }
  };

  /* ---------------- NAVIGATION ---------------- */
  const handleNext = () => {
    const key = STEPS[step].key;

    if (!isStepValid(key)) {
      toast.error("Please complete this step");
      return;
    }

    setCompletedSteps((p) => ({ ...p, [key]: true }));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = Math.round(
    (Object.values(completedSteps).filter(Boolean).length / STEPS.length) * 100
  );

  return (
    <AppLayout>
      <div
        className="
    w-full
    max-w-[330px]
    sm:max-w-[750px]
    lg:max-w-[900px]
    px-0 md:px-0
    sm:px-0
    py-0
    space-y-6
  "
      >

        {/* HEADER */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/rooms"
            className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> Back
          </Link>

          <div className="text-right">
            <h1 className="text-base sm:text-md font-semibold">
              {isEdit ? "Edit Room" : "Add New Room"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length} • {STEPS[step].label}
            </p>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="bg-card border rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>

          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* STEP CHIPS (read-only indicators) */}
          <div
            className="mt-3 hidden sm:flex gap-2 overflow-x-auto pb-1"
          >
            {STEPS.map((s, idx) => {
              const isActive = idx === step;
              const isDone = completedSteps[s.key];

              return (
                <span
                  key={s.key}
                  className={`
            shrink-0 rounded-full border px-3 py-1 text-[11px] sm:text-xs
            ${isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : isDone
                        ? "bg-primary/10 text-primary border-primary/40"
                        : "bg-muted text-muted-foreground"
                    }
          `}
                >
                  {idx + 1}. {s.label}
                </span>
              );
            })}
          </div>
        </div>

        <form onSubmit={onSubmit} onKeyDown={(e) => { if (e.key === "Enter" && step !== STEPS.length - 1) { e.preventDefault(); } }}>


          {/* STEP CONTENT */}
          {step === 0 && (
            <Section title="Basic Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <Field label="Room Name *">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Royal Heritage Suite"
                    className="text-sm"
                  />
                </Field>

                <Field label="Price per Night (₹) *">
                  <Input
                    type="number"
                    value={pricePerNight}
                    onChange={(e) => setPricePerNight(e.target.value)}
                    className="text-sm"
                  />
                </Field>

                <Field label="Max Guests *">
                  <Input
                    type="number"
                    min="1"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value)}
                    placeholder="e.g. 4"
                    className="text-sm"
                  />
                </Field>

              </div>

              <Field label="Description">
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm"
                />
              </Field>

              <Field label="Room Discount">
                <Select
                  value={discountType}
                  onValueChange={setDiscountType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">No Discount</SelectItem>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {discountType !== "none" && (
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label={
                      discountType === "percent"
                        ? "Discount %"
                        : "Discount Amount ₹"
                    }
                    value={discountValue}
                    set={setDiscountValue}
                  />

                  <Field label="Label (Optional)">
                    <Input
                      value={discountLabel}
                      onChange={(e) => setDiscountLabel(e.target.value)}
                      placeholder="e.g. Summer Offer"
                    />
                  </Field>
                </div>
              )}

            </Section>
          )}

          {step === 1 && (
            <Section title="Meal Options">

              <div className="space-y-4">

                {/* OPTION 1 */}
                <div
                  onClick={() => setMealMode(mealMode === "only" ? "" : "only")}
                  className={`
          flex items-center justify-between
          border rounded-xl p-4 cursor-pointer
          transition
          ${mealMode === "only"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"}
        `}
                >
                  <div>
                    <div className="font-medium text-sm">
                      Meal Included (Veg + Non-Veg)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Guests can select meal without extra pricing
                    </div>
                  </div>

                  <div
                    className={`
            h-5 w-5 rounded-full border flex items-center justify-center
            ${mealMode === "only"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"}
          `}
                  >
                    {mealMode === "only" && (
                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {/* OPTION 2 */}
                <div
                  onClick={() => setMealMode(mealMode === "price" ? "" : "price")}
                  className={`
          border rounded-xl p-4 cursor-pointer
          transition space-y-3
          ${mealMode === "price"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"}
        `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        Custom Meal Pricing
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Define separate prices for veg and non-veg
                      </div>
                    </div>

                    <div
                      className={`
              h-5 w-5 rounded-full border flex items-center justify-center
              ${mealMode === "price"
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"}
            `}
                    >
                      {mealMode === "price" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>

                  {mealMode === "price" && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2"
                    >
                      <InputField
                        label="Veg Meal Price (₹)"
                        value={mealPriceVeg}
                        set={setMealPriceVeg}
                      />
                      <InputField
                        label="Non-Veg Meal Price (₹)"
                        value={mealPriceNonVeg}
                        set={setMealPriceNonVeg}
                      />
                    </div>
                  )}
                </div>

              </div>
            </Section>
          )}

          {step === 2 && (
            <Section title="Images">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UploadBox
                  label="Cover Image"
                  hint={coverImage ? "Existing cover loaded" : "Upload a cover image"}
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                />
                <UploadBox
                  label="Gallery Images"
                  hint={`${galleryUrls.length} existing • ${galleryFiles.length} new`}
                  multiple
                  onChange={(e) =>
                    setGalleryFiles(Array.from(e.target.files || []))
                  }
                />
              </div>

              {(coverFile || coverImage) && (
                <div className="bg-muted rounded-xl p-3 text-xs sm:text-sm">
                  <div className="font-medium mb-2">Cover Preview</div>
                  <img
                    src={coverFile ? URL.createObjectURL(coverFile) : coverImage}
                    alt="cover"
                    className="h-32 w-full object-cover rounded-lg"
                  />
                </div>
              )}

              {galleryUrls.length > 0 && (
                <div className="bg-muted rounded-xl p-3">
                  <div className="text-xs sm:text-sm font-medium mb-2">
                    Existing Gallery
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {galleryUrls.map((u) => (
                      <div key={u} className="relative">
                        <img
                          src={u}
                          alt="gallery"
                          className="h-20 w-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryUrls((p) => p.filter((x) => x !== u))
                          }
                          className="absolute top-1 right-1 rounded bg-black/60 text-white text-[10px] px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {galleryFiles.length > 0 && (
                <div className="bg-muted rounded-xl p-3">
                  <div className="text-xs sm:text-sm font-medium mb-2">
                    New Gallery
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {galleryFiles.map((f) => (
                      <div key={f.name} className="relative">
                        <img
                          src={URL.createObjectURL(f)}
                          alt="new"
                          className="h-20 w-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryFiles((p) => p.filter((x) => x !== f))
                          }
                          className="absolute top-1 right-1 rounded bg-black/60 text-white text-[10px] px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {step === 3 && (
            <Section title="Amenities">
              {amenityCategories.map((cat) => {
                const selectedCount = cat.items.filter((i) =>
                  amenities.includes(i.id)
                ).length;
                const isOpen = openCat === cat.id;

                return (
                  <div key={cat.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenCat(isOpen ? null : cat.id)}
                      className="w-full flex items-center justify-between py-3 text-left"
                    >
                      <div>
                        <div className="text-sm sm:text-base font-medium">
                          {cat.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({selectedCount} selected)
                        </div>
                      </div>
                      <span
                        className={`transition-transform ${isOpen ? "rotate-180" : ""
                          }`}
                      >
                        ▾
                      </span>
                    </button>

                    {isOpen && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 pb-4">
                        {cat.items.map((item) => {
                          const active = amenities.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleAmenity(item.id)}
                              className="flex items-center gap-3 text-sm text-left"
                            >
                              <span
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${active
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                                  }`}
                              >
                                {active && (
                                  <span className="h-2 w-2 rounded-full bg-white" />
                                )}
                              </span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {step === 4 && (
            <Section title="House Rules">
              <div className="flex gap-2">
                <Input
                  value={ruleInput}
                  onChange={(e) => setRuleInput(e.target.value)}
                  placeholder="Type a rule..."
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHouseRule();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addHouseRule}>
                  Add
                </Button>
              </div>

              {houseRules.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {houseRules.map((r) => (
                    <div
                      key={r}
                      className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{r}</span>
                      <button
                        type="button"
                        onClick={() => removeHouseRule(r)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {step === 5 && (
            <Section title="Guest Reviews">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Guest name"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  className="text-sm"
                />
                <Input
                  className="md:col-span-2 text-sm"
                  placeholder="Comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={addReview}>
                  Add Review
                </Button>
              </div>

              {reviews.length > 0 && (
                <div className="space-y-3">
                  {reviews.map((r, i) => (
                    <div
                      key={`${r.name}-${i}`}
                      className="border rounded-xl p-4 flex items-start justify-between gap-4 bg-card"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-yellow-500 text-sm">
                          {"★".repeat(Number(r.rating || 0))}
                        </div>
                        {r.comment ? (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {r.comment}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeReview(i)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* {step === 6 && (
            <Section title="Review & Submit">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SummaryCard title="Room">
                  <SummaryRow label="Name" value={name || "—"} />
                  <SummaryRow
                    label="Per Night"
                    value={
                      pricePerNight
                        ? `₹${Number(pricePerNight).toLocaleString("en-IN")}`
                        : "—"
                    }
                  />
                  <SummaryRow
                    label="Description"
                    value={description?.trim() ? description : "—"}
                  />
                </SummaryCard>

                <SummaryCard title="Meals">
                  <SummaryRow
                    label="Veg"
                    value={`₹${Number(mealPriceVeg || 0).toLocaleString("en-IN")}`}
                  />
                  <SummaryRow
                    label="Non-Veg"
                    value={`₹${Number(mealPriceNonVeg || 0).toLocaleString("en-IN")}`}
                  />
                  <SummaryRow
                    label="Combo"
                    value={`₹${Number(mealPriceCombo || 0).toLocaleString("en-IN")}`}
                  />
                </SummaryCard>

                <SummaryCard title="Amenities">
                  <div className="text-sm text-muted-foreground">
                    Selected: <span className="text-foreground font-medium">{amenities.length}</span>
                  </div>
                </SummaryCard>

                <SummaryCard title="House Rules">
                  {houseRules.length ? (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {houseRules.slice(0, 6).map((r) => (
                        <li key={r}>• {r}</li>
                      ))}
                      {houseRules.length > 6 ? (
                        <li className="text-xs">+ {houseRules.length - 6} more</li>
                      ) : null}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </SummaryCard>

                <SummaryCard title="Reviews">
                  <SummaryRow label="Count" value={`${reviews.length}`} />
                  {reviews[0] ? (
                    <div className="mt-2 rounded-lg border p-3 bg-card text-sm">
                      <div className="font-medium">{reviews[0].name}</div>
                      <div className="text-yellow-500">
                        {"★".repeat(Number(reviews[0].rating || 0))}
                      </div>
                      {reviews[0].comment ? (
                        <div className="text-muted-foreground text-xs mt-1">
                          {reviews[0].comment}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </SummaryCard>
              </div>

              <div className="text-xs text-muted-foreground">
                Tip: If something is wrong, go Back and update it.
              </div>
            </Section>
          )} */}

          {/* NAV FOOTER */}
          {/* STICKY FOOTER ACTION BAR */}
          <div className="sticky bottom-0 bg-background/80 backdrop-blur border-t border-border py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 px-3">

              {/* BACK */}
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={step === 0 || uploading || loading}
                className="text-sm"
              >
                Back
              </Button>

              <div className="flex items-center gap-2">

                {/* CANCEL */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/rooms")}
                  disabled={uploading || loading}
                  className="text-sm"
                >
                  Cancel
                </Button>

                {/* NEXT or SUBMIT */}
                {step < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}   // ✅ SAFE
                    disabled={!isStepValid(STEPS[step].key) || uploading || loading}
                    className="text-sm"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"         // ✅ ONLY place submit exists
                    disabled={uploading || loading}
                    className="text-sm"
                  >
                    {uploading
                      ? "Uploading…"
                      : isEdit
                        ? "Update Room"
                        : "Create Room"}
                  </Button>
                )}

              </div>
            </div>
          </div>


        </form>
      </div>
    </AppLayout >
  );
}

/* ================= HELPERS ================= */

function Section({ title, children }) {
  return (
    <div className="bg-card border rounded-xl p-4 sm:p-6 space-y-4">
      <h2 className="font-semibold text-sm sm:text-base">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs sm:text-sm">{label}</Label>
      {children}
    </div>
  );
}

function InputField({ label, value, set }) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        onChange={(e) => set(e.target.value)}
        className="text-sm"
      />
    </Field>
  );
}

function UploadBox({ label, hint, ...props }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs sm:text-sm">{label}</Label>

      <label className="border-dashed border rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer bg-card hover:bg-muted/40 transition">
        <Upload size={18} className="text-muted-foreground" />
        <span className="text-xs sm:text-sm text-muted-foreground">Upload</span>
        {hint ? (
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {hint}
          </span>
        ) : null}
        <input type="file" hidden {...props} />
      </label>
    </div>
  );
}

function SummaryCard({ title, children }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="font-semibold text-sm mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xs sm:text-sm text-right">{String(value)}</div>
    </div>
  );
}
