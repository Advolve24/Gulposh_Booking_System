import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { api } from "../api/http";
import CalendarRange from "../components/CalendarRange";
import GuestCounter from "../components/GuestCounter";
import RoomImageGallery from "../components/RoomImageGallery";
import { amenityCategories } from "../data/aminities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerPortal } from "@/components/ui/drawer";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  ShieldCheck, Clock, Ban, Music, Flame,
  Users, IdCard, MapPin, Star, ChevronDown, ChevronLeft, ChevronRight, ArrowUpLeft, ArrowRight, BedDouble, House, UtensilsCrossed, Info, Instagram
} from "lucide-react";
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import { getWeekendOfferState } from "../lib/weekendOffer";
import { getDisplayedNightlyPrices, getRoomPricingBreakdown } from "../lib/roomPricing";
import { normalizeImageList } from "../lib/image";
import { DEFAULT_ROOM_PATH, getRoomPath } from "../lib/utils";
import { useMediaQuery } from "../hooks/use-media-query";


const humanize = (v = "") =>
  v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const AMENITY_ICONS = amenityCategories.reduce((icons, category) => {
  category.items.forEach((item) => {
    icons[item.id] = item.icon;
  });
  return icons;
}, {});

const AMENITY_LABELS = amenityCategories.reduce((labels, category) => {
  category.items.forEach((item) => {
    labels[item.id] = item.label;
  });
  return labels;
}, {});

const ruleIcon = (text = "") => {
  const t = text.toLowerCase();
  if (t.includes("check")) return Clock;
  if (t.includes("smoking")) return Ban;
  if (t.includes("music")) return Music;
  if (t.includes("id")) return IdCard;
  if (t.includes("guest")) return Users;
  return ShieldCheck;
};

function minusOneDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function mergeRanges(ranges) {
  if (!ranges?.length) return [];
  const sorted = ranges
    .map((r) => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.from <= last.to) {
      if (cur.to > last.to) last.to = cur.to;
    } else {
      out.push(cur);
    }
  }

  return out;
}

function clampGuestSelection(adultsValue, childrenValue, maxGuests) {
  const safeMax = Number(maxGuests || 0);
  const safeAdults = Math.max(0, Number(adultsValue || 0));
  const safeChildren = Math.max(0, Number(childrenValue || 0));

  if (safeMax <= 0) {
    return {
      adults: Math.max(1, safeAdults || 1),
      children: 0,
    };
  }

  const nextAdults = Math.min(Math.max(1, safeAdults || 1), safeMax);
  const remainingCapacity = Math.max(0, safeMax - nextAdults);
  const nextChildren = Math.min(safeChildren, remainingCapacity);

  return {
    adults: nextAdults,
    children: nextChildren,
  };
}

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const MEAL_MENU_PDF_URL = "/villa-gulposh-menu.pdf";
const VILLA_LOCATION_URL =
  "https://www.google.com/maps/dir/18.5827328,73.8885632/Villa+Gulposh,+House+no+32+A,+Dnyandeep+Co-Op+Housing+Society,+Villa+Gulposh+Vidyasagar+Properties+Pvt+Ltd,+Kirawali,+Deulwadi,+Maharashtra+410201/@18.7385871,73.2684341,92694m/data=!3m1!1e3!4m10!4m9!1m1!4e1!1m5!1m1!1s0x3be7fbd691fc22d7:0xad136b1d5b318a7d!2m2!1d73.3207934!2d18.920402!3e0?entry=ttu&g_ep=EgoyMDI2MDQxOS4wIKXMDSoASAFQAw%3D%3D";
const VILLA_LOCATION_EMBED_URL =
  "https://www.google.com/maps?q=Villa%20Gulposh%2C%20House%20no%2032%20A%2C%20Dnyandeep%20Co-Op%20Housing%20Society%2C%20Kirawali%2C%20Karjat%2C%20Maharashtra%20410201&z=9&output=embed";
const GOOGLE_REVIEWS_URL =
  "https://www.google.com/search?sca_esv=36c9f6b89ecd9dae&rlz=1C1RXQR_en-GBIN1072IN1072&sxsrf=ANbL-n64g1KbuAVP5LLpqdu5FjZyyxqRgA:1776944777978&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOURoCHVfIn80LwxZsUmwV7cz1C90e0OvCQIF9f_uVMQEgHqeCnx7_FmycD5nqliZDuN0NHO7Ta6f52TfqO8PN4hnLaTI&q=Villa+Gulposh+Reviews&sa=X&ved=2ahUKEwjWmJuS84OUAxVoRWcHHa9XOs0Q0bkNegQIJBAH&biw=1366&bih=641&dpr=1";

function MealInfoPopover({ iconClassName = "h-4 w-4", triggerClassName = "" }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Meal details"
          className={`inline-flex items-center justify-center rounded-full text-[#d88a95] transition hover:opacity-80 ${triggerClassName}`}
        >
          <Info className={iconClassName} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[280px] rounded-2xl border border-[#e5ddd6] bg-white p-4 shadow-[0_18px_50px_-24px_rgba(42,32,27,0.35)]"
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-[#2A201B]">Meal details</p>
            <p className="mt-1 text-sm leading-6 text-[#5f5248]">
              Meals include Lunch, High Tea, Dinner, Breakfast.
            </p>
          </div>

          <a
            href={MEAL_MENU_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl bg-[#7f1124] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6c0e1e]"
          >
            View menu
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RoomFeatureChip({ icon: Icon, label, withMealInfo = false }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-[8px] bg-[#ebebeb] px-3 py-2 text-sm font-medium text-[#2A201B]">
      <Icon className="h-4 w-4 text-[#d88a95]" />
      <span>{label}</span>
      {withMealInfo ? <MealInfoPopover iconClassName="h-4 w-4" /> : null}
    </div>
  );
}

function MealsIncludedNote() {
  return (
    <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-green-600">
      <span>All Meals are included</span>
      <MealInfoPopover iconClassName="h-4 w-4" />
    </div>
  );
}

function renderBedroomHighlight(text = "") {
  const phrases = [
    "2",
    "+ 1 extra guest",
    "+ 1 extra",
    "King",
    "Queen",
    "bathroom",
    "shower cubicle",
    "geyser",
    "WiFi",
    "AC",
    "fan",
  ];

  const escaped = phrases
    .sort((a, b) => b.length - a.length)
    .map((phrase) => {
      const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const startsWithWord = /^[A-Za-z0-9]/.test(phrase);
      const endsWithWord = /[A-Za-z0-9]$/.test(phrase);
      const leftBoundary = startsWithWord ? "(?<![A-Za-z0-9])" : "";
      const rightBoundary = endsWithWord ? "(?![A-Za-z0-9])" : "";
      return `${leftBoundary}${escapedPhrase}${rightBoundary}`;
    });
  const matcher = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(matcher);

  return parts.map((part, index) => {
    const isHighlighted = phrases.some(
      (phrase) => phrase.toLowerCase() === part.toLowerCase()
    );

    return isHighlighted ? (
      <strong key={`${part}-${index}`} className="font-semibold text-[#2A201B]">
        {part}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
}

function RoomNightlyPrices({
  room,
  range,
  guests = 0,
  adults = 0,
  children = 0,
  align = "right",
  compact = false,
  pricingSummary = null,
}) {
  const wrapperClass =
    align === "center"
      ? "text-center"
      : align === "left"
        ? "text-left flex flex-col gap-0"
        : "text-left sm:text-right";
  const priceClass = compact ? "text-[2rem] font-semibold leading-none" : "text-2xl sm:text-[2rem] font-semibold leading-none";
  const hasStaySelection = Boolean(pricingSummary?.nights > 0 && range?.from && range?.to);
  const { weekendPrice } = getDisplayedNightlyPrices(
    room,
    hasStaySelection
      ? {
          guests,
          adults,
          children,
        }
      : 0
  );
  const label = hasStaySelection
    ? `for ${pricingSummary.nights} night${pricingSummary.nights === 1 ? "" : "s"}`
    : "Weekend Starting from";
  const amount = hasStaySelection ? pricingSummary.totalPayable : weekendPrice;
  const amountSuffix = hasStaySelection ? " Incl. Taxes" : " / N Incl. Taxes";
  const mealsLabel = room?.mealMode === "only" ? "All Meals are included" : "";
  const showDiscountedComparison =
    hasStaySelection &&
    Math.round(Number(pricingSummary?.originalTotalPayable || 0)) >
      Math.round(Number(pricingSummary?.totalPayable || 0));

  return (
    <div className={wrapperClass}>
      <div className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 leading-[18px] ${priceClass}`}>
        {showDiscountedComparison ? (
          <>
            <span className="mr-2 text-lg font-normal text-muted-foreground line-through">
              {formatCurrency(pricingSummary?.originalTotalPayable)}
            </span>
            <span className="text-[24px]">{formatCurrency(pricingSummary?.totalPayable)}</span>
            <span className="ml-0 text-sm font-normal text-muted-foreground">
              {amountSuffix}
            </span>
          </>
        ) : (
          <>
            <span className="text-[24px]">{formatCurrency(amount)}</span>
            <span className="ml-0 text-sm font-normal text-muted-foreground">
              {amountSuffix}
            </span>
          </>
        )}
      </div>
      {mealsLabel ? <MealsIncludedNote /> : null}
    </div>
  );
}

function BookingCard({
  room,
  range,
  setRange,
  adults,
  setAdults,
  children,
  setChildren,
  disabledAll,
  goToCheckout,
  weekendOffer,
  pricingSummary,
  onCapacityMaxAttempt,
  showPriceSummary = true,
  showFooterButton = true,
  showBenefits = true,
}) {
  const totalGuests = adults + children;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* SCROLLABLE CONTENT */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        {showPriceSummary ? (
          <RoomNightlyPrices
            room={room}
            range={range}
            guests={totalGuests}
            adults={adults}
            children={children}
            align="left"
            compact
            pricingSummary={pricingSummary}
          />
        ) : null}

        {/* DATES */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">
            CHECK IN / CHECK OUT
          </label>
          <CalendarRange
            roomId={room._id}
            value={range}
            onChange={setRange}
            disabledRanges={disabledAll}
            showWeekdayInBox
            pricing={{
              weekdayPrice: room?.pricePerNight,
              weekendPrice: room?.weekendPricePerNight || room?.pricePerNight,
            }}
          />
        </div>

        {/* GUESTS */}
        <RoomGuestPopover
          room={room}
          adults={adults}
          setAdults={setAdults}
          children={children}
          setChildren={setChildren}
          onCapacityMaxAttempt={onCapacityMaxAttempt}
        />

        {weekendOffer?.canSuggest && (
          <div className="rounded-[18px] border-2 border-dashed border-[#f5be23] bg-[radial-gradient(circle_at_top_right,_rgba(255,224,130,0.45),_rgba(255,249,219,0.96)_42%,_rgba(255,243,201,0.92)_100%)] p-3 text-[#312312] shadow-[0_10px_28px_-18px_rgba(201,138,0,0.9)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="mt-0 text-[15px] font-semibold leading-5 text-[#1f1406]">
                  {weekendOffer.suggestionTitle}
                </p>
                <p className="mt-0 text-[11px] leading-5 text-[#6c5a35]">
                  {weekendOffer.suggestionBodyPrefix} {weekendOffer.suggestedCheckoutLabel} to unlock the weekend offer.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-auto w-[92px] shrink-0 self-start rounded-lg border border-[#1f1406] bg-white px-3 py-2 text-center text-[13px] font-semibold leading-4 text-[#1f1406] whitespace-normal hover:bg-[#fff7df] sm:self-center"
                onClick={() =>
                  setRange({
                    from: range?.from || null,
                    to: weekendOffer.suggestedCheckout,
                  })
                }
              >
                {weekendOffer.suggestionButtonLabel}
              </Button>
            </div>
          </div>
        )}

        {weekendOffer?.eligible && (
          <div className="rounded-2xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm text-green-800 shadow-sm">
            <p className="font-semibold">
              {weekendOffer.percent}% weekend discount applied
            </p>
            <p className="mt-1 text-xs text-green-700">
              Active for {weekendOffer.appliedTier} weekend night{weekendOffer.appliedTier === 1 ? "" : "s"} in your selected stay.
            </p>
          </div>
        )}

        {pricingSummary?.nights > 0 && (
          <PriceBreakupSummary pricingSummary={pricingSummary} />
        )}




        {/* BENEFITS */}
        <div className="space-y-2 text-sm text-green-700">
          <div>✓ Free cancellation up to 7 days</div>
          <div>✓ Instant confirmation</div>
          <div>✓ Best price guarantee</div>
        </div>
      </div>

      {/* STICKY FOOTER BUTTON */}
      <div className="sticky bottom-0 bg-white pt-3">
        <Button
          onClick={goToCheckout}
          disabled={!range?.from || !range?.to || totalGuests < 1}
          className="
            w-full
            h-12
            rounded-xl
            text-base
            font-semibold
            bg-primary
            hover:bg-primary/90
            shadow-md
          "
        >
          Book Now
        </Button>
      </div>
    </div>
  );
}

function RoomGuestPopover({
  room,
  adults,
  setAdults,
  children,
  setChildren,
  onCapacityMaxAttempt,
}) {
  const totalGuests = adults + children;
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div>
     

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="mt-0 h-16 w-full justify-between rounded-xl border-[#eadfd8] bg-white px-4"
          >
            <div className="text-left">
              <div className="text-[16px] font-semibold text-[#2A201B]">
                {totalGuests} guest{totalGuests === 1 ? "" : "s"}
              </div>
            </div>
            <div className="flex justify-between gap-1">
              <Users className="h-4 w-4 text-[#a11d2e]" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[330px] rounded-2xl p-4"
          side={isDesktop ? "bottom" : "top"}
          align={isDesktop ? "end" : "start"}
          alignOffset={isDesktop ? 400 : 0}
          sideOffset={isDesktop ? -8 : 8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-0">
            <GuestCounter
              label="Adults"
              description="Ages 13+"
              value={adults}
              min={1}
              max={room.maxGuests - children}
              onChange={setAdults}
              onMaxAttempt={onCapacityMaxAttempt}
            />

            <div className="my-3 h-px bg-border" />

            <GuestCounter
              label="Children"
              description="Ages 2-12"
              value={children}
              min={0}
              max={room.maxGuests - adults}
              onChange={setChildren}
              onMaxAttempt={onCapacityMaxAttempt}
            />

            <p className="mt-2 text-xs text-muted-foreground">
              Total guests: <strong>{totalGuests}</strong>
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function PriceBreakupSummary({ pricingSummary }) {
  const [showBreakup, setShowBreakup] = useState(false);
  const triggerRef = useRef(null);
  const breakdownButtonRef = useRef(null);
  const popupRef = useRef(null);
  const [popupStyle, setPopupStyle] = useState({
    position: "fixed",
    left: 16,
    top: 16,
  });

  if (!pricingSummary?.nights) return null;

  useEffect(() => {
    if (!showBreakup) return;

    const updatePopupPosition = () => {
      const triggerEl = breakdownButtonRef.current || triggerRef.current;
      const popupEl = popupRef.current;
      if (!triggerEl || !popupEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const popupRect = popupEl.getBoundingClientRect();
      const gap = 12;
      const viewportPadding = 16;
      const headerClearance = 76;

      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const openAbove =
        spaceBelow < popupRect.height + gap && spaceAbove > spaceBelow;

      let top = openAbove
        ? triggerRect.top - popupRect.height - gap
        : triggerRect.bottom + gap;

      if (top < headerClearance) {
        top = headerClearance;
      }

      if (top + popupRect.height > window.innerHeight - viewportPadding) {
        top = Math.max(
          viewportPadding,
          window.innerHeight - popupRect.height - viewportPadding
        );
      }

      let left = triggerRect.left - popupRect.width - gap;
      if (left < viewportPadding) {
        left = triggerRect.right + gap;
      }
      if (left + popupRect.width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - popupRect.width - viewportPadding;
      }
      if (left < viewportPadding) {
        left = viewportPadding;
      }

      setPopupStyle({
        position: "fixed",
        top,
        left,
      });
    };

    updatePopupPosition();
    window.addEventListener("scroll", updatePopupPosition, true);
    window.addEventListener("resize", updatePopupPosition);

    return () => {
      window.removeEventListener("scroll", updatePopupPosition, true);
      window.removeEventListener("resize", updatePopupPosition);
    };
  }, [showBreakup]);

  return (
    <div
      ref={triggerRef}
      className="relative py-0 px-2"
      onMouseEnter={() => setShowBreakup(true)}
      onMouseLeave={() => setShowBreakup(false)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Total
          </div>
          <div className="mt-0 text-[11px] text-muted-foreground">
            {pricingSummary.dateLabel} • {pricingSummary.nights} night{pricingSummary.nights === 1 ? "" : "s"}
          </div>
          <button
            ref={breakdownButtonRef}
            type="button"
            className="mt-1 text-sm font-medium text-[#0a66c2] underline underline-offset-2"
            onFocus={() => setShowBreakup(true)}
            onBlur={() => setShowBreakup(false)}
          >
            View price breakup
          </button>
        </div>

        <div className="text-right">
          <div className="text-[24px] font-semibold leading-none text-[#2A201B]">
            {formatCurrency(pricingSummary.totalPayable)}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">(incl. GST)</div>
        </div>
      </div>

      {showBreakup ? (
        <div
          ref={popupRef}
          style={popupStyle}
          className="z-[120] w-[325px] rounded-3xl border border-[#e9dfd8] bg-white px-4 py-4 shadow-[0_20px_60px_-28px_rgba(42,32,27,0.35)]"
        >
          <div className="text-[20px] font-semibold text-[#2A201B]">Price Breakup</div>

          <div className="mt-4 space-y-3 text-[13px]">
            {pricingSummary.weekdayNights > 0 ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[14px] font-medium text-[#2A201B]">Weekday Charges</div>
                  <div className="text-[13px] text-muted-foreground">
                    {formatCurrency(pricingSummary.weekdayBasePerNight)} x {pricingSummary.weekdayNights} night{pricingSummary.weekdayNights === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-[14px] font-semibold text-[#2A201B]">
                  {formatCurrency(pricingSummary.weekdayBaseTotal)}
                </div>
              </div>
            ) : null}

            {pricingSummary.weekendNights > 0 ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[14px] font-medium text-[#2A201B]">Weekend Charges</div>
                  <div className="text-[13px] text-muted-foreground">
                    {formatCurrency(pricingSummary.weekendBasePerNight)} x {pricingSummary.weekendNights} night{pricingSummary.weekendNights === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-[14px] font-semibold text-[#2A201B]">
                  {formatCurrency(pricingSummary.weekendBaseTotal)}
                </div>
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4 border-t border-[#efe7e1] pt-3">
              <div>
                <div className="text-[14px] font-medium text-[#2A201B]">Stay Charges</div>
                <div className="text-[13px] text-muted-foreground">
                  {pricingSummary.nights} night{pricingSummary.nights === 1 ? "" : "s"} subtotal
                </div>
              </div>
              <div className="text-[14px] font-semibold text-[#2A201B]">
                {formatCurrency(pricingSummary.roomSubtotal)}
              </div>
            </div>

            {pricingSummary.weekendDiscountAmount > 0 ? (
              <div className="flex items-start justify-between gap-4 border-t border-[#efe7e1] pt-4">
                <div>
                  <div className="text-[14px] font-medium text-[#12824c]">
                    Weekend Discount ({pricingSummary.weekendEligibleNights} night{pricingSummary.weekendEligibleNights === 1 ? "" : "s"} @ {pricingSummary.weekendDiscountPercent}%)
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    Applied on {formatCurrency(pricingSummary.weekendDiscountBaseAmount)}
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    {formatCurrency(pricingSummary.weekendDiscountBaseAmount)} x {pricingSummary.weekendDiscountPercent}% = {formatCurrency(pricingSummary.weekendDiscountAmount)}
                  </div>
                </div>
                <div className="text-[14px] font-semibold text-[#12824c]">
                  -{formatCurrency(pricingSummary.weekendDiscountAmount)}
                </div>
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4 border-t border-[#efe7e1] pt-3">
              <div className="text-[14px] font-medium text-[#2A201B]">GST</div>
              <div className="text-[14px] font-semibold text-[#2A201B]">
                {formatCurrency(pricingSummary.totalTax)}
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 border-t border-[#efe7e1] pt-3">
              <div>
                <div className="text-[14px] font-medium text-[#2A201B]">Meals</div>
                <div className="text-[13px] text-muted-foreground">Included</div>
              </div>
              <div className="text-[14px] font-semibold text-[#12824c]">Included</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#efe7e1] pt-3">
            <div className="text-[15px] font-semibold text-[#2A201B]">Total Payable</div>
            <div className="text-[21px] font-semibold leading-none text-[#2A201B]">
              {formatCurrency(pricingSummary.totalPayable)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildBedroomCards(images) {
  const dedicatedImages = [
    "/The-Jade-Slipper.webp",
    "/The-Blue-Vanda.webp",
    "/The-White-Egret.webp",
  ];
  const galleryImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const fallbackImage = "/placeholder-room.jpg";

  const bedroomContent = [
    {
      id: "bedroom-1",
      name: "The Jade Slipper",
      highlights: [
        "Accommodates 2 guests + 1 extra guest",
        "King sized bed with attached bathroom",
        "Attached bathroom features a shower cubicle, instant geyser, and essential toiletries",
        "Equipped with WiFi, AC, fan, and all standard amenities for a comfortable stay",
      ],
    },
    {
      id: "bedroom-2",
      name: "The Blue Vanda",
      highlights: [
        "Queen sized bed with attached bathroom",
        "All standard amenities",
      ],
    },
    {
      id: "bedroom-3",
      name: "The White Egret",
      highlights: [
        "Queen sized bed with bathtub",
        "All standard amenities",
      ],
    },
  ];

  return bedroomContent.map((item, index) => ({
    ...item,
    images: [
      dedicatedImages[index] || fallbackImage,
      ...galleryImages.filter((_, galleryIndex) => galleryIndex % bedroomContent.length === index),
    ].filter((image, imageIndex, arr) => arr.indexOf(image) === imageIndex),
  }));
}

function BedroomsSection({ images = [] }) {
  const cards = useMemo(() => buildBedroomCards(images), [images]);
  const viewportRef = useRef(null);
  const dragStartXRef = useRef(null);
  const dragDeltaXRef = useRef(0);
  const [activeCard, setActiveCard] = useState(0);
  const [activeBedroomPhotos, setActiveBedroomPhotos] = useState({});
  const [lightboxBedroom, setLightboxBedroom] = useState(null);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 1024 ? 2 : 1
  );
  const [viewportWidth, setViewportWidth] = useState(0);

  const gap = cardsPerView === 2 ? 20 : 16;
  const desktopPeek = cardsPerView === 2 ? 72 : 0;
  const maxDotIndex = Math.max(0, cards.length - cardsPerView);
  const dotIndexes = Array.from({ length: maxDotIndex + 1 }, (_, index) => index);
  const clampedActiveCard = Math.min(activeCard, maxDotIndex);
  const cardWidth =
    cardsPerView === 2
      ? Math.max(0, (viewportWidth - gap - desktopPeek) / 2)
      : Math.max(0, viewportWidth);
  const visibleCardWidth =
    cardWidth && cardsPerView === 2 ? Math.max(0, cardWidth - 8) : cardWidth;
  const translateX = clampedActiveCard * (visibleCardWidth + gap);

  useEffect(() => {
    const handleResize = () => {
      setCardsPerView(window.innerWidth >= 1024 ? 2 : 1);
      setViewportWidth(viewportRef.current?.clientWidth || 0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setActiveCard((current) => Math.min(current, maxDotIndex));
  }, [maxDotIndex]);

  const scrollToCard = (index) => {
    setActiveCard(Math.max(0, Math.min(index, maxDotIndex)));
  };

  const goPrev = () => {
    setActiveCard((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    setActiveCard((current) => Math.min(maxDotIndex, current + 1));
  };

  const setBedroomPhoto = (cardId, nextIndex) => {
    setActiveBedroomPhotos((current) => ({
      ...current,
      [cardId]: nextIndex,
    }));
  };

  const goToNextBedroomPhoto = (cardId, totalPhotos) => {
    if (totalPhotos <= 1) return;
    const currentIndex = activeBedroomPhotos[cardId] || 0;
    setBedroomPhoto(cardId, (currentIndex + 1) % totalPhotos);
  };

  const goToPrevBedroomPhoto = (cardId, totalPhotos) => {
    if (totalPhotos <= 1) return;
    const currentIndex = activeBedroomPhotos[cardId] || 0;
    setBedroomPhoto(cardId, (currentIndex - 1 + totalPhotos) % totalPhotos);
  };

  const openBedroomLightbox = (card, startIndex = 0) => {
    setLightboxBedroom(card);
    setLightboxPhotoIndex(startIndex);
  };

  const closeBedroomLightbox = () => {
    setLightboxBedroom(null);
    setLightboxPhotoIndex(0);
  };

  const goToNextLightboxPhoto = () => {
    const totalPhotos = lightboxBedroom?.images?.length || 0;
    if (totalPhotos <= 1) return;
    setLightboxPhotoIndex((current) => (current + 1) % totalPhotos);
  };

  const goToPrevLightboxPhoto = () => {
    const totalPhotos = lightboxBedroom?.images?.length || 0;
    if (totalPhotos <= 1) return;
    setLightboxPhotoIndex((current) => (current - 1 + totalPhotos) % totalPhotos);
  };

  const stopSliderEvent = (event) => {
    event.stopPropagation();
  };

  const stopSliderPointerStart = (event) => {
    event.stopPropagation();
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  };

  const handlePointerDown = (event) => {
    dragStartXRef.current = event.clientX;
    dragDeltaXRef.current = 0;
  };

  const handlePointerMove = (event) => {
    if (dragStartXRef.current === null) return;
    dragDeltaXRef.current = event.clientX - dragStartXRef.current;
  };

  const finishDrag = () => {
    if (dragStartXRef.current === null) return;

    const swipeThreshold = 48;
    const deltaX = dragDeltaXRef.current;

    if (deltaX <= -swipeThreshold) {
      goNext();
    } else if (deltaX >= swipeThreshold) {
      goPrev();
    }

    dragStartXRef.current = null;
    dragDeltaXRef.current = 0;
  };

  return (
    <section>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold">Bedrooms</h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-[#6d5c52]">
            <BedDouble className="h-4 w-4 text-primary" />
            <span>3 curated sleeping spaces</span>
          </div>
        </div>

        {maxDotIndex > 0 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={clampedActiveCard === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-primary bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Previous bedroom slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={clampedActiveCard === maxDotIndex}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-primary bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Next bedroom slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative px-0 md:px-0">
        <div
          ref={viewportRef}
          className="overflow-hidden cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onPointerLeave={finishDrag}
          style={{ touchAction: "pan-y" }}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              gap: `${gap}px`,
              transform: `translateX(-${translateX}px)`,
            }}
          >
            {cards.map((card) => (
              <article
                key={card.id}
                className="shrink-0 overflow-hidden rounded-[22px] border border-[#eadfd6] bg-white "
                style={{ width: visibleCardWidth ? `${visibleCardWidth}px` : cardsPerView === 2 ? "calc(50% - 14px)" : "100%" }}
              >
                {(() => {
                  const totalPhotos = card.images?.length || 1;
                  const activePhoto = activeBedroomPhotos[card.id] || 0;
                  const currentImage = card.images?.[activePhoto] || "/placeholder-room.jpg";

                  return (
                <div className="relative">
                  <img
                    src={currentImage}
                    alt={card.name}
                    className="h-[210px] lg:h-[225px] w-full object-cover"
                  />

                  <button
                    type="button"
                    onMouseDown={stopSliderPointerStart}
                    onTouchStart={stopSliderPointerStart}
                    onPointerDown={stopSliderPointerStart}
                    onClick={() => openBedroomLightbox(card, activePhoto)}
                    className="absolute inset-0 z-[1] block w-full cursor-pointer text-left"
                    aria-label={`Open photo gallery for ${card.name}`}
                  />

                  <div className="absolute left-4 top-4 rounded-xl bg-black/65 px-3 py-1 text-sm font-semibold tracking-wide text-white">
                    {activePhoto + 1}/{totalPhotos}
                  </div>

                  {totalPhotos > 1 ? (
                    <>
                      <button
                        type="button"
                        onMouseDown={stopSliderPointerStart}
                        onTouchStart={stopSliderPointerStart}
                        onPointerDown={stopSliderPointerStart}
                        onClick={() => goToPrevBedroomPhoto(card.id, totalPhotos)}
                        className="absolute left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/80 bg-transparent text-white shadow-md transition hover:bg-white/10"
                        aria-label={`Previous photo for ${card.name}`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onMouseDown={stopSliderPointerStart}
                        onTouchStart={stopSliderPointerStart}
                        onPointerDown={stopSliderPointerStart}
                        onClick={() => goToNextBedroomPhoto(card.id, totalPhotos)}
                        className="absolute right-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/80 bg-transparent text-white shadow-md transition hover:bg-white/10"
                        aria-label={`Next photo for ${card.name}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-5 pb-5 pt-10">
                    <h4 className="text-lg lg:text-xl font-semibold text-white">{card.name}</h4>
                    {totalPhotos > 1 ? (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {card.images.map((_, imageIndex) => (
                          <button
                            key={`${card.id}-dot-${imageIndex}`}
                            type="button"
                            onMouseDown={stopSliderPointerStart}
                            onTouchStart={stopSliderPointerStart}
                            onPointerDown={stopSliderPointerStart}
                            onClick={() => setBedroomPhoto(card.id, imageIndex)}
                            className={`z-10 cursor-pointer h-2 rounded-full transition ${
                              imageIndex === activePhoto ? "w-5 bg-white" : "w-2 bg-white/60"
                            }`}
                            aria-label={`Show photo ${imageIndex + 1} for ${card.name}`}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                  );
                })()}

                <div className="space-y-1 px-4 py-4 text-sm lg:text-[14px] leading-5 text-[#3b302a]">
                  {card.highlights.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <p>{renderBedroomHighlight(item)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!lightboxBedroom} onOpenChange={(open) => !open && closeBedroomLightbox()}>
        <DialogContent className="w-[92vw] max-w-4xl overflow-hidden rounded-[28px] border border-[#eadfd6] bg-white p-0 [&>button]:right-4 [&>button]:top-4 [&>button]:z-20 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:border [&>button]:border-[#d8d3cd] [&>button]:bg-white [&>button]:p-0 [&>button]:text-[#2A201B] [&>button]:opacity-100 [&>button]:shadow-md">
          {lightboxBedroom ? (
            <div className="relative bg-white">
              <img
                src={lightboxBedroom.images?.[lightboxPhotoIndex] || "/placeholder-room.jpg"}
                alt={lightboxBedroom.name}
                className="h-[56vh] w-full bg-white object-contain p-4 md:h-[72vh] md:p-6"
              />

              <div className="absolute left-5 top-5 rounded-xl bg-black/65 px-3 py-1 text-sm font-semibold tracking-wide text-white">
                {lightboxPhotoIndex + 1}/{lightboxBedroom.images?.length || 1}
              </div>

              {(lightboxBedroom.images?.length || 0) > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goToPrevLightboxPhoto}
                    className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/95 text-[#2A201B] shadow-md transition hover:bg-white"
                    aria-label={`Previous photo for ${lightboxBedroom.name}`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={goToNextLightboxPhoto}
                    className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/95 text-[#2A201B] shadow-md transition hover:bg-white"
                    aria-label={`Next photo for ${lightboxBedroom.name}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}

              <div className="px-6 pb-6 pt-2">
                <h4 className="text-xl font-semibold text-[#2A201B]">{lightboxBedroom.name}</h4>
                {(lightboxBedroom.images?.length || 0) > 1 ? (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {lightboxBedroom.images.map((_, imageIndex) => (
                      <button
                        key={`${lightboxBedroom.id}-lightbox-dot-${imageIndex}`}
                        type="button"
                        onClick={() => setLightboxPhotoIndex(imageIndex)}
                        className={`h-2.5 rounded-full transition ${
                          imageIndex === lightboxPhotoIndex ? "w-6 bg-primary" : "w-2.5 bg-[#e5b9c0]"
                        }`}
                        aria-label={`Show photo ${imageIndex + 1} for ${lightboxBedroom.name}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ExperiencesSection() {
  const [activeTab, setActiveTab] = useState("paid");

  const experiences = {
    paid: [
      {
        id: "barbecue",
        title: "Barbecue",
        price: "500 / night",
        image: "/Barbecue.webp",
      },
      {
        id: "bonfire",
        title: "Bonfire",
        price: "650 / night",
        image: "/Bonfire.webp",
      },
    ],
  };

  const tabs = [
    { id: "paid", label: "Paid" },
  ];

  const items = experiences[activeTab] || [];

  return (
    <section>
      <div className="mb-5">
        <h3 className="text-lg sm:text-xl font-semibold">Experiences</h3>
        <p className="mt-2 text-sm text-[#6d5c52]">
          Enjoy a variety of experiences, request yours after booking.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[#6608100f] text-[#2A201B]"
                  : "bg-white text-[#6d5c52] hover:bg-[#faf7f4]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-[22px] border border-[#eadfd6] bg-white shadow-[0_14px_30px_-28px_rgba(42,32,27,0.45)]"
          >
            <img
              src={item.image}
              alt={item.title}
              className="h-[220px] w-full object-cover"
            />

            <div className="space-y-2 px-4 py-4">
              <h4 className="text-xl font-semibold text-[#2A201B]">{item.title}</h4>
              <p className="text-[15px] text-[#6d5c52]">
                Starting ₹{item.price}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SneakPeekSection({ images = [] }) {
  const instagramUrl = "https://www.instagram.com/villagulposh/";
  const fallbackImages = [
    "/EntireVilla.webp",
    "/The-Jade-Slipper.webp",
    "/Bonfire.webp",
    "/Barbecue.webp",
  ];

  const previewImages = (images?.length ? images : fallbackImages)
    .filter(Boolean)
    .slice(0, 4);

  const previewCards = previewImages.map((image, index) => ({
    id: `peek-${index + 1}`,
    image,
    eyebrow: index % 2 === 0 ? "Reel" : "Post",
    title:
      [
        "Villa corners",
        "Bedroom moments",
        "Golden hour vibes",
        "Outdoor experiences",
      ][index] || "Villa moments",
  }));

  return (
    <section className="p-4 rounded-[10px] border border-[#f3f3f3] ">
      <div className="mb-3 md:mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold">Sneak peek to the villa</h3>
          <p className="mt-2 text-sm text-[#6d5c52]">
            Catch glimpses of villa life, warm corners, and moments from Gulposh on Instagram.
          </p>
        </div>

        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <Instagram className="h-4 w-4" />
          Follow on Instagram
        </a>
      </div>

    </section>
  );
}

function MobileReviewsSlider({ reviews = [], onViewMore, previewOnly = true }) {
  const viewportRef = useRef(null);
  const dragStartXRef = useRef(null);
  const dragDeltaXRef = useRef(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const slides = (previewOnly ? reviews.slice(0, 2) : reviews).map((review) => ({
    type: "review",
    review,
  }));

  if (previewOnly && reviews.length > 2) {
    slides.push({ type: "view-more" });
  }

  const maxSlideIndex = Math.max(0, slides.length - 1);
  const gap = 16;
  const slideWidth = Math.max(0, viewportWidth);
  const translateX = activeSlide * (slideWidth + gap);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(viewportRef.current?.clientWidth || 0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setActiveSlide((current) => Math.min(current, maxSlideIndex));
  }, [maxSlideIndex]);

  const goPrev = () => {
    setActiveSlide((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    setActiveSlide((current) => Math.min(maxSlideIndex, current + 1));
  };

  const handlePointerDown = (event) => {
    dragStartXRef.current = event.clientX;
    dragDeltaXRef.current = 0;
  };

  const handlePointerMove = (event) => {
    if (dragStartXRef.current === null) return;
    dragDeltaXRef.current = event.clientX - dragStartXRef.current;
  };

  const finishDrag = () => {
    if (dragStartXRef.current === null) return;

    const swipeThreshold = 48;
    const deltaX = dragDeltaXRef.current;

    if (deltaX <= -swipeThreshold) {
      goNext();
    } else if (deltaX >= swipeThreshold) {
      goPrev();
    }

    dragStartXRef.current = null;
    dragDeltaXRef.current = 0;
  };

  if (slides.length === 0) return null;

  return (
    <div className="md:hidden">
      {maxSlideIndex > 0 ? (
        <div className="mb-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeSlide === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2A201B]/35 bg-white text-[#2A201B] transition hover:bg-[#f8f4f1] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Previous review slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={activeSlide === maxSlideIndex}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2A201B]/35 bg-white text-[#2A201B] transition hover:bg-[#f8f4f1] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Next review slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className="overflow-hidden cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={finishDrag}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            gap: `${gap}px`,
            transform: `translateX(-${translateX}px)`,
          }}
        >
          {slides.map((slide, index) =>
            slide.type === "review" ? (
              <div
                key={`review-${index}`}
                className="shrink-0 rounded-xl border bg-white p-4 transition hover:shadow-sm"
                style={{ width: slideWidth ? `${slideWidth}px` : "100%" }}
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                    {slide.review.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-medium">{slide.review.name}</div>
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      {Array.from({ length: slide.review.rating }, (_, index) => (
                        <Star key={index} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>

                {slide.review.comment ? (
                  <p className="text-sm leading-relaxed text-gray-700">
                    {slide.review.comment}
                  </p>
                ) : null}
              </div>
            ) : (
              <button
                key="review-view-more"
                type="button"
                onClick={onViewMore}
                className="flex shrink-0 items-center justify-center rounded-xl border border-dashed border-[#d7cbc4] bg-[#faf7f4] p-4 text-sm font-semibold text-[#2A201B] transition hover:bg-[#f4ece6]"
                style={{ width: slideWidth ? `${slideWidth}px` : "100%" }}
              >
                View More Reviews
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function MobilePriceBreakupPanel({ open, onOpenChange, pricingSummary }) {
  if (!pricingSummary?.nights) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:hidden [&>button]:hidden fixed left-1/2 top-auto bottom-[104px] z-[141] w-[calc(100vw-32px)] max-w-none translate-x-[-50%] translate-y-0 rounded-3xl border border-[#e9dfd8] bg-white px-4 py-4 shadow-[0_20px_60px_-28px_rgba(42,32,27,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[18px] font-semibold text-[#2A201B]">Price Breakup</div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full bg-black/5 text-lg text-black/70"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-3 text-[13px]">
          {pricingSummary.weekdayNights > 0 ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[14px] font-medium text-[#2A201B]">Weekday Charges</div>
                <div className="text-[13px] text-muted-foreground">
                  {formatCurrency(pricingSummary.weekdayBasePerNight)} x {pricingSummary.weekdayNights} night{pricingSummary.weekdayNights === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-[14px] font-semibold text-[#2A201B]">
                {formatCurrency(pricingSummary.weekdayBaseTotal)}
              </div>
            </div>
          ) : null}

          {pricingSummary.weekendNights > 0 ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[14px] font-medium text-[#2A201B]">Weekend Charges</div>
                <div className="text-[13px] text-muted-foreground">
                  {formatCurrency(pricingSummary.weekendBasePerNight)} x {pricingSummary.weekendNights} night{pricingSummary.weekendNights === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-[14px] font-semibold text-[#2A201B]">
                {formatCurrency(pricingSummary.weekendBaseTotal)}
              </div>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-4 border-t border-[#efe7e1] pt-3">
            <div>
              <div className="text-[14px] font-medium text-[#2A201B]">Stay Charges</div>
              <div className="text-[13px] text-muted-foreground">
                {pricingSummary.nights} night{pricingSummary.nights === 1 ? "" : "s"} subtotal
              </div>
            </div>
            <div className="text-[14px] font-semibold text-[#2A201B]">
              {formatCurrency(pricingSummary.roomSubtotal)}
            </div>
          </div>

          {pricingSummary.weekendDiscountAmount > 0 ? (
            <div className="flex items-start justify-between gap-4 border-t border-[#efe7e1] pt-4">
              <div>
                <div className="text-[14px] font-medium text-[#12824c]">
                  Weekend Discount ({pricingSummary.weekendEligibleNights} night{pricingSummary.weekendEligibleNights === 1 ? "" : "s"} @ {pricingSummary.weekendDiscountPercent}%)
                </div>
                <div className="text-[13px] text-muted-foreground">
                  Applied on {formatCurrency(pricingSummary.weekendDiscountBaseAmount)}
                </div>
                <div className="text-[13px] text-muted-foreground">
                  {formatCurrency(pricingSummary.weekendDiscountBaseAmount)} x {pricingSummary.weekendDiscountPercent}% = {formatCurrency(pricingSummary.weekendDiscountAmount)}
                </div>
              </div>
              <div className="text-[14px] font-semibold text-[#12824c]">
                -{formatCurrency(pricingSummary.weekendDiscountAmount)}
              </div>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-4 border-t border-[#efe7e1] pt-3">
            <div className="text-[14px] font-medium text-[#2A201B]">GST</div>
            <div className="text-[14px] font-semibold text-[#2A201B]">
              {formatCurrency(pricingSummary.totalTax)}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 border-t border-[#efe7e1] pt-3">
            <div>
              <div className="text-[14px] font-medium text-[#2A201B]">Meals</div>
              <div className="text-[13px] text-muted-foreground">Included</div>
            </div>
            <div className="text-[14px] font-semibold text-[#12824c]">Included</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#efe7e1] pt-3">
          <div className="text-[15px] font-semibold text-[#2A201B]">Total Payable</div>
          <div className="text-[21px] font-semibold leading-none text-[#2A201B]">
            {formatCurrency(pricingSummary.totalPayable)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoomPaymentMethodsBox() {
  return (
    <div className="border rounded-[12px]">
      <p className="text-[16px] font-[600] text-green-600 p-3 flex items-center justify-center">
        <ShieldCheck className="inline w-5 h-5 mr-1 " />
        100% safe and secure payments.
      </p>

      <div className="border-t flex items-center justify-between">
        <img src="/verifiedbyvisa.png" alt="Verified by Visa" className="w-full h-11 object-contain p-2" />
        <img src="/mastercard.png" alt="Mastercard" className="w-full h-10 object-contain p-2" />
        <img src="/Rupay.png" alt="Rupay" className="w-full h-8 object-contain p-2" />
        <img src="/Upi.png" alt="UPI" className="w-full h-8 object-contain p-2" />
      </div>
    </div>
  );
}

function MobileBookingDrawerCard({
  room,
  range,
  setRange,
  adults,
  setAdults,
  children,
  setChildren,
  disabledAll,
  weekendOffer,
  pricingSummary,
  onCapacityMaxAttempt,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">
            CHECK IN / CHECK OUT
          </label>
          <CalendarRange
            roomId={room._id}
            value={range}
            onChange={setRange}
            disabledRanges={disabledAll}
            showWeekdayInBox
            pricing={{
              weekdayPrice: room?.pricePerNight,
              weekendPrice: room?.weekendPricePerNight || room?.pricePerNight,
            }}
          />
        </div>

        <RoomGuestPopover
          room={room}
          adults={adults}
          setAdults={setAdults}
          children={children}
          setChildren={setChildren}
          onCapacityMaxAttempt={onCapacityMaxAttempt}
        />

        {weekendOffer?.canSuggest && (
          <div className="rounded-[18px] border-2 border-dashed border-[#f5be23] bg-[radial-gradient(circle_at_top_right,_rgba(255,224,130,0.45),_rgba(255,249,219,0.96)_42%,_rgba(255,243,201,0.92)_100%)] p-3 text-[#312312] shadow-[0_10px_28px_-18px_rgba(201,138,0,0.9)]">
            <div className="flex flex-col gap-2">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-5 text-[#1f1406]">
                  {weekendOffer.suggestionTitle}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#6c5a35]">
                  {weekendOffer.suggestionBodyPrefix} {weekendOffer.suggestedCheckoutLabel} to unlock the better weekend offer.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-lg border border-[#1f1406] bg-white px-4 text-center text-[13px] font-semibold text-[#1f1406] hover:bg-[#fff7df]"
                onClick={() =>
                  setRange({
                    from: range?.from || null,
                    to: weekendOffer.suggestedCheckout,
                  })
                }
              >
                {weekendOffer.suggestionButtonLabel}
              </Button>
            </div>
          </div>
        )}

        {weekendOffer?.eligible && pricingSummary?.nights > 0 ? (
          <div className="rounded-2xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm text-green-800 shadow-sm">
            <p className="font-semibold">
              {weekendOffer.percent}% weekend discount applied
            </p>
            <p className="mt-1 text-xs text-green-700">
              Active for {weekendOffer.appliedTier} weekend night{weekendOffer.appliedTier === 1 ? "" : "s"} in your selected stay.
            </p>
          </div>
        ) : null}

        <RoomPaymentMethodsBox />
      </div>
    </div>
  );
}

function MobileStickyBookingBar({
  room,
  totalGuests,
  adults = 0,
  children = 0,
  pricingSummary,
  hasMobileStaySelection,
  handleMobileBreakupOpen,
  handleMobileBookNow,
  showDrawer = false,
  containerRef = null,
}) {
  const ctaLabel = showDrawer && hasMobileStaySelection ? "Continue" : "Book Now";
  const mobileStartingWeekendPrice = getDisplayedNightlyPrices(
    room,
    hasMobileStaySelection
      ? {
          guests: totalGuests,
          adults,
          children,
        }
      : 0
  ).weekendPrice;

  return (
    <div
      ref={containerRef}
      className={`
        fixed bottom-0 left-0 right-0 md:hidden
        bg-white border-t px-4 py-3
        pointer-events-auto
        ${showDrawer ? "z-[90]" : "z-[60]"}
      `}
    >
      <div className="flex items-center gap-3 max-w-md mx-auto">
        <div className="min-w-0 flex-1">
          {hasMobileStaySelection ? (
            <>
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Total
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-none text-[#2A201B]">
                {formatCurrency(pricingSummary.totalPayable)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">(incl. GST)</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {pricingSummary.dateLabel} • {pricingSummary.nights} night{pricingSummary.nights === 1 ? "" : "s"}
              </div>
              <button
                type="button"
                className="mt-1 text-sm font-medium text-[#0a66c2] underline underline-offset-2"
                onClick={handleMobileBreakupOpen}
              >
                View price breakup
              </button>
            </>
          ) : (
            <>
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Weekend Starting from
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-none text-[#2A201B]">
                {formatCurrency(mobileStartingWeekendPrice)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ N Incl. Taxes</span>
              </div>
              {room?.mealMode === "only" ? <MealsIncludedNote /> : null}
            </>
          )}
        </div>

        <Button
          onClick={handleMobileBookNow}
          className="
            w-[42%]
            h-12
            rounded-xl
            text-base
            font-semibold
            bg-primary
            hover:bg-primary/90
            shadow-md
          "
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}




export default function RoomPage() {
  const location = useLocation();
  const { openAuth, user } = useAuth();
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const roomIdentifier = id || slug;

  const navState = location.state;
  const initialSearch = navState || null;

  const [room, setRoom] = useState(null);
  const [allRooms, setAllRooms] = useState([]);
  const [range, setRange] = useState(() => {
    if (!initialSearch?.range?.from || !initialSearch?.range?.to) return undefined;

    return {
      from: new Date(initialSearch.range.from),
      to: new Date(initialSearch.range.to),
    };
  });

  const [adults, setAdults] = useState(initialSearch?.adults ?? 6);
  const [children, setChildren] = useState(initialSearch?.children ?? 0);



  const totalGuests = adults + children;

  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showMobileBreakup, setShowMobileBreakup] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [capacityPopupOpen, setCapacityPopupOpen] = useState(false);
  const mobileDrawerFooterRef = useRef(null);
  const [discountConfig, setDiscountConfig] = useState({
    taxPercent: 0,
    weekendDiscountEnabled: false,
    twoWeekendNightsDiscountPercent: 0,
    threeWeekendNightsDiscountPercent: 0,
  });

  const handleBack = () => {
    window.location.href = "https://villagulposh.com";
  };



  // useEffect(() => {
  //   // If user navigated without search state (e.g. back + new room)
  //   if (!location.state) {
  //     setRange(undefined);
  //     setAdults(1);
  //     setChildren(0);
  //   }
  // }, [id]);


  useEffect(() => {
    if (range?.from && typeof range.from === "string") {
      setRange({
        from: new Date(range.from),
        to: new Date(range.to),
      });
    }
  }, []);


  useEffect(() => {
    api.get(`/rooms/${roomIdentifier}`).then(({ data }) => setRoom(data));
    api.get("/rooms").then(({ data }) => setAllRooms(data || []));

    api.get("/rooms/disabled/all").then(({ data }) =>
      setBookedAll(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: minusOneDay(toDateOnlyFromAPIUTC(b.to || b.endDate)),
        }))
      )
    );

    api.get("/blackouts").then(({ data }) =>
      setBlackoutRanges(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }))
      )
    );

    api.get("/tax").then(({ data }) => {
      setDiscountConfig({
        taxPercent: Number(data.taxPercent || 0),
        weekendDiscountEnabled: Boolean(data.weekendDiscountEnabled),
        twoWeekendNightsDiscountPercent: Number(
          data.twoWeekendNightsDiscountPercent || 0
        ),
        threeWeekendNightsDiscountPercent: Number(
          data.threeWeekendNightsDiscountPercent || 0
        ),
      });
    }).catch(() => {
      setDiscountConfig({
        taxPercent: 0,
        weekendDiscountEnabled: false,
        twoWeekendNightsDiscountPercent: 0,
        threeWeekendNightsDiscountPercent: 0,
      });
    });
  }, [roomIdentifier]);

  useEffect(() => {
    if (!room?._id) return;

    const canonicalPath = getRoomPath(room);
    const currentPath = location.pathname;

    if (currentPath !== canonicalPath) {
      navigate(`${canonicalPath}${location.search}`, {
        replace: true,
        state: location.state || null,
      });
    }
  }, [location.pathname, location.search, location.state, navigate, room]);

  useEffect(() => {
    if (!room?.maxGuests) return;

    const source = navState || null;

    if (source?.range?.from && source?.range?.to) {
      setRange({
        from: new Date(source.range.from),
        to: new Date(source.range.to),
      });
    }

    const clamped = clampGuestSelection(
      source?.adults ?? adults,
      source?.children ?? children,
      room.maxGuests
    );

    setAdults(clamped.adults);
    setChildren(clamped.children);
  }, [roomIdentifier, room?.maxGuests]);

  const disabledAll = useMemo(
    () => mergeRanges([...blackoutRanges, ...bookedAll]),
    [blackoutRanges, bookedAll]
  );

  const allImages = useMemo(
    () => normalizeImageList([room?.coverImage, ...(room?.galleryImages || [])]),
    [room]
  );

  const avgRating = useMemo(() => {
    if (!room?.reviews?.length) return null;
    return (
      room.reviews.reduce((a, r) => a + r.rating, 0) / room.reviews.length
    ).toFixed(1);
  }, [room]);

  const roomBaseGuests = Number(room?.baseGuests || 6);
  const roomMaxGuests = Number(room?.maxGuests || 10);
  const displayedAmenities = useMemo(() => {
    const amenities = Array.isArray(room?.amenities) ? [...room.amenities] : [];
    if (!amenities.includes("swimming_pool")) {
      amenities.push("swimming_pool");
    }
    return amenities;
  }, [room?.amenities]);
  const roomAddressLine = room?.location || "Karjat, Maharashtra";
  const roomFeatureChips = [
    { icon: Users, label: `${roomBaseGuests}–${roomMaxGuests} Guests` },
    { icon: BedDouble, label: "3 Bedrooms" },
    { icon: House, label: "Entire Home" },
    { icon: UtensilsCrossed, label: "Meals Included", withMealInfo: true },
  ];

  const weekendOffer = useMemo(() => {
    if (!range?.from || !range?.to) {
      return null;
    }
    return getWeekendOfferState(range, discountConfig, disabledAll);
  }, [disabledAll, discountConfig, range]);

  const roomPricing = useMemo(
    () =>
      getRoomPricingBreakdown(
        room,
        range,
        Number(discountConfig.taxPercent || 0),
        {
          guests: totalGuests,
          adults,
          children,
        }
      ),
    [adults, children, discountConfig.taxPercent, range, room, totalGuests]
  );

  const pricingSummary = useMemo(() => {
    if (!room || !range?.from || !range?.to || roomPricing.nights <= 0) {
      return null;
    }

    const taxPercent = Number(discountConfig.taxPercent || 0);
    const weekendBaseTotal = Number(roomPricing.weekendBaseTotal || 0);
    const weekdayBaseTotal = Math.max(
      0,
      Number(roomPricing.baseTotal || 0) - weekendBaseTotal
    );
    const weekendDiscountAmount =
      weekendOffer?.eligible && roomPricing.weekendNights > 0
        ? Math.round(
            (weekendBaseTotal *
              Number(weekendOffer.percent || 0)) /
              100
          )
        : 0;
    const preciseRoomSubtotal = Number(roomPricing.baseTotal || 0);
    const roomSubtotal =
      room.taxMode === "included" && weekendDiscountAmount > 0
        ? Math.round(preciseRoomSubtotal)
        : preciseRoomSubtotal;
    const originalTotalTax = Number(((roomSubtotal * taxPercent) / 100).toFixed(2));
    const discountedSubtotal = Math.max(0, preciseRoomSubtotal - weekendDiscountAmount);
    const totalTax = Number(((discountedSubtotal * taxPercent) / 100).toFixed(2));
    const originalTotalPayable =
      room.taxMode === "included"
        ? Math.round(Number(roomPricing.grossTotal || 0))
        : Number((roomSubtotal + originalTotalTax).toFixed(2));
    const totalPayable =
      room.taxMode === "included"
        ? Math.round(discountedSubtotal + totalTax)
        : Number((discountedSubtotal + totalTax).toFixed(2));

    return {
      nights: roomPricing.nights,
      weekdayNights: roomPricing.weekdayNights,
      weekendNights: roomPricing.weekendNights,
      roomBasePerNight:
        roomPricing.nights > 0
          ? Number((roomSubtotal / roomPricing.nights).toFixed(2))
          : 0,
      weekdayBasePerNight:
        roomPricing.weekdayNights > 0
          ? Number((weekdayBaseTotal / roomPricing.weekdayNights).toFixed(2))
          : 0,
      weekendBasePerNight:
        roomPricing.weekendNights > 0
          ? Number((weekendBaseTotal / roomPricing.weekendNights).toFixed(2))
          : 0,
      weekdayBaseTotal: Number(weekdayBaseTotal.toFixed(2)),
      weekendBaseTotal: Number(weekendBaseTotal.toFixed(2)),
      roomSubtotal,
      weekendDiscountAmount,
      weekendDiscountBaseAmount: Number(weekendBaseTotal.toFixed(2)),
      weekendDiscountPercent: Number(weekendOffer?.percent || 0),
      weekendEligibleNights: Number(weekendOffer?.eligibleNights || 0),
      discountedSubtotal,
      totalTax,
      totalPayable,
      originalTotalPayable,
      dateLabel: `${new Date(range.from).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${new Date(range.to).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
    };
  }, [discountConfig.taxPercent, range, room, roomPricing, weekendOffer]);

  const recommendedRooms = useMemo(() => {
    if (!room?._id) return [];

    return allRooms
      .filter(
        (candidate) =>
          candidate._id !== room._id &&
          Number(candidate.maxGuests || 0) > Number(room.maxGuests || 0)
      )
      .sort((a, b) => Number(a.maxGuests || 0) - Number(b.maxGuests || 0));
  }, [allRooms, room]);

  const savedBookingSearch = useMemo(
    () => ({
      range,
      adults,
      children,
    }),
    [range, adults, children]
  );

  const roomSearch = useMemo(() => {
    const params = new URLSearchParams();

    if (range?.from && range?.to) {
      params.set("from", new Date(range.from).toISOString());
      params.set("to", new Date(range.to).toISOString());
    }

    if (totalGuests > 0) {
      params.set("guests", String(totalGuests));
    }

    const query = params.toString();
    return query ? `?${query}` : "";
  }, [range, totalGuests]);

  const handleCapacityMaxAttempt = () => {
    setCapacityPopupOpen(true);
  };

  const hasMobileStaySelection = Boolean(pricingSummary?.nights > 0 && range?.from && range?.to);

  const handleMobileBreakupOpen = () => {
    if (!hasMobileStaySelection) return;
    setShowMobileBreakup(true);
  };

  const handleMobileBookNow = () => {
    if (showDrawer && hasMobileStaySelection) {
      goToCheckout();
      return;
    }
    setShowDrawer(true);
  };

  const goToSuggestedRoom = (targetRoomId) => {
    sessionStorage.setItem("searchParams", JSON.stringify(savedBookingSearch));
    setCapacityPopupOpen(false);
    const targetRoom = allRooms.find((candidate) => candidate._id === targetRoomId);
    navigate(`${getRoomPath(targetRoomId, targetRoom?.name)}${roomSearch}`, {
      state: savedBookingSearch,
    });
  };

  const goToEntireVilla = () => {
    sessionStorage.setItem("searchParams", JSON.stringify(savedBookingSearch));
    setCapacityPopupOpen(false);
    navigate("/entire-villa-form");
  };

  const goToCheckout = () => {
    if (!range?.from || !range?.to || totalGuests < 1) {
      toast.error("Please select dates and guests");
      return;
    }

    const bookingState = {
      roomId: room._id,
      startDate: range.from,
      endDate: range.to,
      guests: Number(totalGuests),
      adults,
      children,
    };

    if (!user) {
      sessionStorage.setItem(
        "postAuthRedirect",
        JSON.stringify({
          redirectTo: "/checkout",
          bookingState,
        })
      );

      openAuth();
      return;
    }

    if (!user.profileComplete) {
      navigate("/complete-profile", {
        state: {
          redirectTo: "/checkout",
          bookingState,
        },
      });
      return;
    }

    navigate("/checkout", { state: bookingState });
  };

  if (!room) return null;

  function AccordionItem({ item, open, onToggle }) {
    return (
      <div
        className={`border rounded-xl px-4 transition ${open ? "bg-muted/40" : ""
          }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex justify-between items-center py-4 text-sm font-medium text-left"
        >
          {item.q}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""
              }`}
          />
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-4" : "max-h-0"
            }`}
        >
          <p className="text-sm text-gray-600 leading-relaxed text-left">
            {item.a}
          </p>
        </div>
      </div>
    );
  }


  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-6 py-6 space-y-3 pb-28 md:pb-8">
        {/* BACK */}
        <button
          onClick={handleBack}
          className="text-l hover:opacity-100 bg-black/10 p-2 rounded-[8px] pr-4 w-fit flex gap-1"
        >
          <ArrowUpLeft className="text-black/60" />
          Back
        </button>

        <RoomImageGallery images={allImages} title={room.name} />

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 md:items-center">
          <div className="mt-4">
            <h1 className="text-xl sm:text-2xl font-bold text-[#2A201B]">{room.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-[#7a6c62]" />
              <span>{roomAddressLine}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {roomFeatureChips.map((chip) => (
                <RoomFeatureChip
                  key={chip.label}
                  icon={chip.icon}
                  label={chip.label}
                  withMealInfo={chip.withMealInfo}
                />
              ))}
            </div>
            {avgRating && (
              <div className="flex items-center gap-1 text-sm mt-3">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>{avgRating}</span>
                <span className="text-muted-foreground">
                  ({room.reviews.length} reviews)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* GRID */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* LEFT */}
          <div className="w-full md:w-[64%] space-y-10">
            {/* DESCRIPTION */}
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
              {room.description}
            </p>

            {/* AMENITIES */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Amenities</h3>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedAmenities
                  .filter((a) => a !== "music_system")
                  .map((a) => {
                  const Icon = AMENITY_ICONS[a];
                  return (
                    <div
                      key={a}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border"
                    >
                      {Icon && <Icon className="w-5 h-5 text-primary" />}
                      <span className="text-sm">{AMENITY_LABELS[a] || humanize(a)}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* HOUSE RULES */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                House Rules
              </h3>

              <ul className="grid grid-cols-1 gap-x-10 gap-y-1 text-sm sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3">
                {(room.houseRules || []).slice(0, 5).map((r, i) => {
                  const Icon = ruleIcon(r);
                  return (
                    <li key={i} className="flex gap-3">
                      <Icon className="w-4 h-4 text-primary mt-0.5" />
                      <span>{r}</span>
                    </li>
                  );
                })}
                <li>
                  <Link
                    to="/house-rules"
                    className="inline-flex items-center rounded-[8px] bg-white px-4 py-2 text-sm font-semibold text-primary shadow-[0_1px_3px_rgba(42,32,27,0.06),0_8px_18px_rgba(42,32,27,0.08)] transition hover:text-[#7f1124] hover:shadow-[0_2px_6px_rgba(42,32,27,0.08),0_10px_20px_rgba(42,32,27,0.1)]"
                  >
                    View all
                  </Link>
                </li>
              </ul>
            </section>

            <BedroomsSection images={allImages} />

            {/* LOCATION */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Location</h3>

              <div className="space-y-4">
                <div className="flex gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <a
                    href={VILLA_LOCATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition"
                  >
                    Villa Gulposh, Vidyasagar Properties Pvt Ltd. House no 32 A, Dnyandeep
                    <br />
                    Society, Kirawali, Karjat - 410201
                  </a>
                </div>

                <div className="overflow-hidden rounded-[22px] border border-[#eadfd6] bg-white shadow-[0_14px_30px_-28px_rgba(42,32,27,0.45)]">
                  <iframe
                    title="Villa Gulposh location map"
                    src={VILLA_LOCATION_EMBED_URL}
                    className="h-[260px] w-full md:h-[340px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </section>

            {/* REVIEWS */}
            {room.reviews?.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold">
                    Guest Reviews
                  </h3>

                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{avgRating}</span>
                    <span className="text-gray-500">
                      ({room.reviews.length} reviews)
                    </span>
                  </div>
                </div>

                {!showAllReviews ? (
                  <>
                    <MobileReviewsSlider
                      reviews={room.reviews}
                      onViewMore={() => {
                        window.location.href = GOOGLE_REVIEWS_URL;
                      }}
                    />
                    <div className="hidden space-y-4 md:block">
                      {room.reviews.slice(0, 2).map((r, i) => (
                        <div
                          key={i}
                          className="border rounded-xl p-4 bg-white transition hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                              {r.name?.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1">
                              <div className="font-medium text-sm">{r.name}</div>
                              <div className="flex items-center gap-0.5 text-yellow-500">
                                {Array.from({ length: r.rating }, (_, index) => (
                                  <Star key={index} className="h-3.5 w-3.5 fill-current" />
                                ))}
                              </div>
                            </div>
                          </div>

                          {r.comment && (
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {r.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <MobileReviewsSlider
                      reviews={room.reviews}
                      previewOnly={false}
                    />
                    <div className="hidden space-y-4 md:block">
                      {room.reviews.map((r, i) => (
                        <div
                          key={i}
                          className="border rounded-xl p-4 bg-white transition hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                              {r.name?.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1">
                              <div className="font-medium text-sm">{r.name}</div>
                              <div className="flex items-center gap-0.5 text-yellow-500">
                                {Array.from({ length: r.rating }, (_, index) => (
                                  <Star key={index} className="h-3.5 w-3.5 fill-current" />
                                ))}
                              </div>
                            </div>
                          </div>

                          {r.comment && (
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {r.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {room.reviews.length > 2 && !showAllReviews && (
                  <a
                    href={GOOGLE_REVIEWS_URL}
                    className="mt-4 hidden w-full rounded-lg border py-2 text-center text-sm transition hover:bg-muted md:block"
                  >
                    View All Reviews
                  </a>
                )}
                {showAllReviews && (
                  <button
                    type="button"
                    onClick={() => setShowAllReviews(false)}
                    className="mt-4 w-full border rounded-lg py-2 text-sm hover:bg-muted transition"
                  >
                    Show Less
                  </button>
                )}
              </section>
            )}

            <ExperiencesSection />

            <SneakPeekSection images={allImages} />

            {/* FAQ */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                Frequently Asked Questions
              </h3>

              <div className="space-y-3">
                {[
                  {
                    q: "Can I book only one or two rooms, or do I need to book the entire Home?",
                    a: "No, you cannot book just one room. You would need to book the entire home.",
                  },
                  {
                    q: "Are meals provided onsite? What are the charges?",
                    a: "Meals are provided onsite and can be availed at additional charges. We levy an on-site cash handling charge and request you to pay for all meals before check-in to avoid this inconvenience. Furthermore, all digitally checked-in guests can avail of additional Reward Points and Villa gulposh Infinitum benefits for pre-paid meals.\n\nTea/Coffee will be served during breakfast and afternoon tea time. If you would like tea/coffee during the day, this will be arranged at an additional charge.",
                  },
                  {
                    q: "Do you allow loud music?",
                    a: "We're planning to drive down. Are the roads good? Any specific things we need to know?",
                  },
                  {
                    q: "What are the check-in and check-out timings?",
                    a: "Check-in: 12:00 PM\n\nCheck-out: 10:00 AM",
                  },
                  {
                    q: "Can I cancel my booking from the portal?",
                    a: "Yes. Cancellation is available directly on booking.villagulposh.com (Cancel Booking option).",
                  },
                ].map((item, i) => (
                  <AccordionItem
                    key={i}
                    item={item}
                    open={openFaqIndex === i}
                    onToggle={() =>
                      setOpenFaqIndex(openFaqIndex === i ? null : i)
                    }
                  />
                ))}

              </div>
            </section>
          </div>

          {/* RIGHT – BOOKING CARD (✅ SAME AS HOMEPAGE CALENDAR) */}
          <div className="hidden md:block w-[34%] sticky top-24 h-fit space-y-4">



            <div className="border border-[#eadfd6] rounded-2xl p-5 space-y-5 bg-white">
              <RoomNightlyPrices
                room={room}
                range={range}
                guests={totalGuests}
                adults={adults}
                children={children}
                align="left"
                compact
                pricingSummary={pricingSummary}
              />

              {/* SAME CALENDAR RANGE AS HOMEPAGE (popover with date boxes) */}
              <div>
              <CalendarRange
                value={range}
                onChange={setRange}
                disabledRanges={disabledAll}
                showWeekdayInBox
                pricing={{
                  weekdayPrice: room?.pricePerNight,
                  weekendPrice: room?.weekendPricePerNight || room?.pricePerNight,
                }}
              />
              </div>

            {/* GUESTS */}
            <RoomGuestPopover
              room={room}
              adults={adults}
              setAdults={setAdults}
              children={children}
              setChildren={setChildren}
              onCapacityMaxAttempt={handleCapacityMaxAttempt}
            />

            {weekendOffer?.canSuggest && (
              <div className="rounded-[18px] border-2 border-dashed border-[#f5be23] bg-[radial-gradient(circle_at_top_right,_rgba(255,224,130,0.45),_rgba(255,249,219,0.96)_42%,_rgba(255,243,201,0.92)_100%)] p-3 text-[#312312] shadow-[0_10px_28px_-18px_rgba(201,138,0,0.9)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="mt-0 text-[15px] font-semibold leading-5 text-[#1f1406]">
                      {weekendOffer.suggestionTitle}
                    </p>
                    <p className="mt-0 text-[11px] leading-5 text-[#6c5a35]">
                      {weekendOffer.suggestionBodyPrefix} {weekendOffer.suggestedCheckoutLabel} to unlock the weekend offer.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full md:w-[62px] shrink-0 self-start rounded-lg border border-[#1f1406] bg-white px-3 py-2 text-center text-[13px] font-semibold leading-4 text-[#1f1406] whitespace-normal hover:bg-[#fff7df] sm:self-center"
                    onClick={() =>
                      setRange({
                        from: range?.from || null,
                        to: weekendOffer.suggestedCheckout,
                      })
                    }
                  >
                    {weekendOffer.suggestionButtonLabel}
                  </Button>
                </div>
              </div>
            )}

            {weekendOffer?.eligible && (
              <div className="rounded-2xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm text-green-800 shadow-sm">
                <p className="font-semibold">
                  {weekendOffer.percent}% weekend discount applied
                </p>
                <p className="mt-1 text-xs text-green-700">
                  Active for {weekendOffer.appliedTier} weekend night{weekendOffer.appliedTier === 1 ? "" : "s"} in your selected stay.
                </p>
              </div>
            )}

            {pricingSummary?.nights > 0 && (
              <PriceBreakupSummary pricingSummary={pricingSummary} />
            )}

            {/* BOOK NOW */}
            <Button
              onClick={goToCheckout}
              disabled={!range?.from || !range?.to || totalGuests < 1}
              className="
                w-full h-12 rounded-xl
                font-medium
                bg-primary text-primary-foreground
                hover:bg-primary/90
                active:scale-[0.99]
                transition
              "
            >
              Book Now
            </Button>

            <div className="border rounded-[12px]">
              <p className="text-[16px] font-[600] text-green-600 p-3 flex items-center justify-center">
                <ShieldCheck className="inline w-5 h-5 mr-1 " />
                100% safe and secure payments.
              </p>

              <div className="border-t flex items-center justify-between">
                <img src="/verifiedbyvisa.png" alt="Verified by Visa" className="w-full h-11 object-contain p-2" />
                <img src="/mastercard.png" alt="Mastercard" className="w-full h-10 object-contain p-2" />
                <img src="/Rupay.png" alt="Rupay" className="w-full h-8 object-contain p-2" />
                <img src="/Upi.png" alt="UPI" className="w-full h-8 object-contain p-2" />
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY FOOTER */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 md:hidden
          bg-white border-t
          px-4 py-3
          z-[60]
          ${showDrawer ? "hidden" : ""}
        `}
      >
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="min-w-0 flex-1">
            {hasMobileStaySelection ? (
              <>
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Total
                </div>
                <div className="mt-1 text-[22px] font-semibold leading-none text-[#2A201B]">
                  {formatCurrency(pricingSummary.totalPayable)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">(incl. GST)</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {pricingSummary.dateLabel} • {pricingSummary.nights} night{pricingSummary.nights === 1 ? "" : "s"}
                </div>
                <button
                  type="button"
                  className="mt-1 text-sm font-medium text-[#0a66c2] underline underline-offset-2"
                  onClick={handleMobileBreakupOpen}
                >
                  View price breakup
                </button>
              </>
            ) : (
              <>
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Weekend Starting from
                </div>
                <div className="mt-1 text-[22px] font-semibold leading-none text-[#2A201B]">
                  {formatCurrency(
                    getDisplayedNightlyPrices(room, {
                      guests: totalGuests,
                      adults,
                      children,
                    }).weekendPrice
                  )}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ N Incl. Taxes</span>
                </div>
                {room?.mealMode === "only" ? <MealsIncludedNote /> : null}
              </>
            )}
          </div>

          <Button
            onClick={handleMobileBookNow}
            className="
        w-[42%]
        h-12
        rounded-xl
        text-base
        font-semibold
        bg-primary
        hover:bg-primary/90
        shadow-md
      "
          >
            Book Now
          </Button>
        </div>
      </div>

      {showMobileBreakup && hasMobileStaySelection ? (
        <MobilePriceBreakupPanel
          open={showMobileBreakup}
          onOpenChange={setShowMobileBreakup}
          pricingSummary={pricingSummary}
        />
      ) : null}

      {/* MOBILE DRAWER */}
      <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
      {showDrawer ? (
        <DrawerPortal>
          <MobileStickyBookingBar
            room={room}
            totalGuests={totalGuests}
            adults={adults}
            children={children}
            pricingSummary={pricingSummary}
            hasMobileStaySelection={hasMobileStaySelection}
            handleMobileBreakupOpen={handleMobileBreakupOpen}
            handleMobileBookNow={handleMobileBookNow}
            showDrawer
            containerRef={mobileDrawerFooterRef}
          />
        </DrawerPortal>
      ) : null}
      <DrawerContent
          overlayClassName="pointer-events-none"
          onInteractOutside={(event) => {
            if (mobileDrawerFooterRef.current?.contains(event.target)) {
              event.preventDefault();
            }
          }}
          className="
      flex
      bottom-[92px]
      h-[calc(65vh-92px)]
      max-h-[calc(65vh-92px)]
      flex-col
      rounded-t-2xl
      bg-white
      pt-3
      pb-4
      overflow-hidden
    "
        >
          {/* HEADER */}
          <DrawerHeader
            className="
    relative
    shrink-0
    px-4
    mb-2
    flex
    items-center
  "
          >
            {/* CENTERED TITLE */}
            <DrawerTitle
              className="
      absolute
      left-1/2
      -translate-x-1/2
      text-base
      font-semibold
    "
            >
              Complete your booking
            </DrawerTitle>

            {/* CLOSE BUTTON (RIGHT ALIGNED) */}
            <DrawerClose className="ml-auto">
              <X className="w-5 h-5 text-muted-foreground" />
            </DrawerClose>
          </DrawerHeader>


          {/* CENTERED BOOKING CARD (NO EDGE TOUCH) */}
          <div className="min-h-0 flex-1 overflow-hidden px-4">
            <div className="mx-auto flex h-full min-h-0 max-w-[330px] flex-col overflow-hidden">
              <MobileBookingDrawerCard
                room={room}
                range={range}
                setRange={setRange}
                adults={adults}
                setAdults={setAdults}
                children={children}
                setChildren={setChildren}
                disabledAll={disabledAll}
                goToCheckout={goToCheckout}
                weekendOffer={weekendOffer}
                pricingSummary={pricingSummary}
                onCapacityMaxAttempt={handleCapacityMaxAttempt}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {capacityPopupOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCapacityPopupOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setCapacityPopupOpen(false)}
              className="absolute right-4 top-4 z-10 h-9 w-9 rounded-full bg-black/5 text-lg text-black/70 transition hover:bg-black/10"
            >
              X
            </button>

            <div className="border-b border-[#eadfd6] px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ba081c]">
                Online Booking Capacity Reached
              </div>
              <h3 className="mt-2 text-2xl font-semibold text-[#2A201B]">
                More than {room.maxGuests} guests? Don&apos;t worry, we are happy to accommodate.
              </h3>
            </div>

            <div className="px-6 py-6">
              <div className="space-y-3">
                {recommendedRooms.map((candidate) => (
                  <button
                    key={candidate._id}
                    type="button"
                    onClick={() => goToSuggestedRoom(candidate._id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#eadfd6] bg-[#fffaf7] px-4 py-4 text-left transition hover:border-[#ba081c] hover:bg-[#fff4f1]"
                  >
                    <div>
                      <div className="text-base font-semibold text-[#2A201B]">
                        {candidate.name}
                      </div>
                      <div className="text-sm text-[#6d5c52]">
                        Max guest capacity: {candidate.maxGuests}
                      </div>
                    </div>
                    <ArrowUpLeft className="h-4 w-4 text-[#ba081c]" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={goToEntireVilla}
                    className="flex w-full items-center justify-between rounded-2xl bg-[#ba081c] px-4 py-4 text-left text-white transition hover:bg-[#a00718]"
                >
                  <div>
                    <div className="text-base font-semibold">
                      Send Enquiry
                    </div>
                    <div className="text-sm text-white/85">
                      We will get in touch with you to discuss and book.
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}




