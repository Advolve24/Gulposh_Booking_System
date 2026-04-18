
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpLeft, MapPin, Users, Utensils, Check, User, Mail, Phone, Home, CalendarIcon, Flame, ShieldCheck, CreditCard } from "lucide-react";
import { toDateOnly, toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import CalendarRange from "../components/CalendarRange";
import { loadRazorpayScript } from "../lib/loadRazorpay";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../lib/location";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";
import { getWeekendOfferState } from "../lib/weekendOffer";
import { getDisplayedNightlyPrices, getRoomPricingBreakdown } from "../lib/roomPricing";
import GuestCounter from "../components/GuestCounter";
import { resolveImageUrl } from "../lib/image";


function minusOneDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function normalizeDateStart(dateLike) {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date;
}

function doesOfferOverlapSelectedStay(offer, range) {
  if (!offer?.validFrom || !offer?.validTo || !range?.from || !range?.to) {
    return false;
  }

  const stayStart = normalizeDateStart(range.from);
  const stayEndExclusive = normalizeDateStart(range.to);
  const offerStart = normalizeDateStart(offer.validFrom);
  const offerEndExclusive = normalizeDateStart(offer.validTo);

  return stayStart < offerEndExclusive && stayEndExclusive > offerStart;
}

function getOfferEligibleNights(offer, range) {
  if (!offer?.validFrom || !offer?.validTo || !range?.from || !range?.to) {
    return 0;
  }

  const stayStart = normalizeDateStart(range.from);
  const stayEndExclusive = normalizeDateStart(range.to);
  const offerStart = normalizeDateStart(offer.validFrom);
  const offerEndExclusive = normalizeDateStart(offer.validTo);

  const overlapStart = stayStart > offerStart ? stayStart : offerStart;
  const overlapEndExclusive =
    stayEndExclusive < offerEndExclusive ? stayEndExclusive : offerEndExclusive;

  return Math.max(
    0,
    Math.round((overlapEndExclusive - overlapStart) / (1000 * 60 * 60 * 24))
  );
}

const INR = (num) =>
  `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const INRExact = (num) =>
  `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const CHECK_IN_TIME = "12:00 PM";
const CHECK_OUT_TIME = "10:00 AM";

function CheckoutPriceSummaryCard({
  room,
  range,
  nights,
  grandTotal,
  originalGrandTotal,
  roomChargeTotal,
  weekendDiscountAmount,
  weekendEligibleNights,
  weekendOffer,
  totalTax,
}) {
  const [showBreakup, setShowBreakup] = useState(false);

  const dateLabel =
    range?.from && range?.to
      ? `${format(range.from, "MMM d")} - ${format(range.to, "MMM d")}`
      : "";
  const showDiscountedComparison =
    nights > 0 &&
    Math.round(Number(originalGrandTotal || 0)) >
    Math.round(Number(grandTotal || 0));

  return (
    <div
      className="relative rounded-2xl bg-white p-2"
      onMouseEnter={() => setShowBreakup(true)}
      onMouseLeave={() => setShowBreakup(false)}
    >
      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {nights > 0 ? `For ${nights} night${nights === 1 ? "" : "s"}` : "Starting from"}
      </div>
      <div className="mt-1">
        {showDiscountedComparison ? (
          <>
            <span className="mr-2 text-lg font-normal text-muted-foreground line-through">
              {INR(originalGrandTotal)}
            </span>
            <span className="text-[24px] font-semibold text-[#2A201B]">{INR(grandTotal)}</span>
            <span className="ml-1 text-sm font-normal text-muted-foreground">Incl. Taxes</span>
          </>
        ) : (
          <>
            <span className="text-[24px] font-semibold text-[#2A201B]">
              {INR(nights > 0 ? grandTotal : room?.pricePerNight)}
            </span>
            <span className="ml-1 text-sm font-normal text-muted-foreground">Incl. Taxes</span>
          </>
        )}
      </div>
      {room?.mealMode === "only" ? (
        <div className="mt-1 text-sm text-green-600">All Meals are included</div>
      ) : null}

    </div>
  );
}

function CheckoutGuestPopover({
  room,
  adults,
  setAdults,
  children,
  setChildren,
  onMaxAttempt,
}) {
  const totalGuests = adults + children;

  return (
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
          <div className="flex items-center gap-1">
            <span>MAX {room.maxGuests || 10}</span>
            <Users className="h-4 w-4 text-[#a11d2e]" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[330px] rounded-2xl p-4"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-4">
          <GuestCounter
            label="Adults"
            description="Ages 13+"
            value={adults}
            min={1}
            max={room.maxGuests - children}
            onChange={setAdults}
            onMaxAttempt={onMaxAttempt}
          />

          <GuestCounter
            label="Children"
            description="Ages 2-12"
            value={children}
            min={0}
            max={room.maxGuests - adults}
            onChange={setChildren}
            onMaxAttempt={onMaxAttempt}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CheckoutPaymentMethodsBox() {
  return (
    <div className="border rounded-[12px]">
      <p className="flex items-center justify-center p-3 text-[16px] font-[600] text-green-600">
        <ShieldCheck className="mr-1 inline h-5 w-5" />
        100% safe and secure payments.
      </p>

      <div className="flex items-center justify-between border-t">
        <img
          src="/verifiedbyvisa.png"
          alt="Verified by Visa"
          className="h-11 w-full object-contain p-2"
        />
        <img
          src="/mastercard.png"
          alt="Mastercard"
          className="h-10 w-full object-contain p-2"
        />
        <img
          src="/Rupay.png"
          alt="Rupay"
          className="h-8 w-full object-contain p-2"
        />
        <img
          src="/Upi.png"
          alt="UPI"
          className="h-8 w-full object-contain p-2"
        />
      </div>
    </div>
  );
}

function CheckoutSidebarBookingCard({
  room,
  roomId,
  range,
  setRange,
  disabledRanges,
  adults,
  setAdults,
  children,
  setChildren,
  weekendOffer,
  pricingSummaryProps,
  onMaxAttempt,
  onProceed,
  processingPayment,
  acceptedTerms,
  showProceedButton = true,
  paymentMethodsPosition = "after-button",
  fullWidthOfferButton = false,
}) {
  return (
    <div className="rounded-2xl border border-[#eadfd6] bg-white p-5 space-y-3">
      <div className="space-y-3">
        <CheckoutPriceSummaryCard {...pricingSummaryProps} />

        <div>
          <CalendarRange
            roomId={roomId}
            value={range}
            onChange={(r) => {
              setRange({
                from: r?.from || null,
              to: r?.to || null,
            });
          }}
            disabledRanges={disabledRanges}
            showWeekdayInBox
            pricing={{
              weekdayPrice: room?.pricePerNight,
              weekendPrice: room?.weekendPricePerNight || room?.pricePerNight,
            }}
          />
        </div>

        <CheckoutGuestPopover
          room={room}
          adults={adults}
          setAdults={setAdults}
          children={children}
          setChildren={setChildren}
          onMaxAttempt={onMaxAttempt}
        />

        {paymentMethodsPosition === "after-guests" ? <CheckoutPaymentMethodsBox /> : null}

        {weekendOffer?.canSuggest && (
          <div className="rounded-[18px] border-2 border-dashed border-[#f5be23] bg-[radial-gradient(circle_at_top_right,_rgba(255,224,130,0.45),_rgba(255,249,219,0.96)_42%,_rgba(255,243,201,0.92)_100%)] p-3 text-[#312312] shadow-[0_10px_28px_-18px_rgba(201,138,0,0.9)]">
            <div
              className={
                fullWidthOfferButton
                  ? "flex flex-col gap-2"
                  : "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              }
            >
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
                className={
                  fullWidthOfferButton
                    ? "h-10 w-full rounded-lg border border-[#1f1406] bg-white px-4 text-center text-[13px] font-semibold text-[#1f1406] hover:bg-[#fff7df]"
                    : "h-auto w-[92px] shrink-0 self-start rounded-lg border border-[#1f1406] bg-white px-3 py-2 text-center text-[13px] font-semibold leading-4 text-[#1f1406] whitespace-normal hover:bg-[#fff7df] sm:self-center"
                }
                onClick={() =>
                  setRange((prev) => ({
                    from: prev?.from || null,
                    to: weekendOffer.suggestedCheckout,
                  }))
                }
              >
                {weekendOffer.suggestionButtonLabel}
              </Button>
            </div>
          </div>
        )}

        {weekendOffer?.eligible && (
          <div className="rounded-2xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 text-sm text-green-800 shadow-sm">
            <p className="font-semibold">
              {weekendOffer.percent}% weekend discount applied
            </p>
            <p className="mt-1 text-xs text-green-700">
              Active for {weekendOffer.appliedTier} weekend night{weekendOffer.appliedTier === 1 ? "" : "s"} in your selected stay.
            </p>
          </div>
        )}

      </div>

      {showProceedButton ? (
        <div className="pt-3">
          <Button
            disabled={processingPayment || !acceptedTerms}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-700 text-base hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-white disabled:opacity-100"
            onClick={onProceed}
          >
            {processingPayment ? "Processing..." : "Proceed to Payment"}
          </Button>
        </div>
      ) : null}

      {paymentMethodsPosition === "after-button" ? <CheckoutPaymentMethodsBox /> : null}
    </div>
  );
}

function CheckoutRoomSummaryCard({
  room,
  totalGuests,
  withMeal,
  range,
  nights,
  roomPricing,
  roomChargeTotal,
  mealTotal,
  couponDiscountAmount,
  weekendDiscountAmount,
  weekendEligibleNights,
  weekendOffer,
  specialOfferAmount,
  specialOfferEligibleNights,
  specialOffer,
  cgstPercent,
  cgstAmount,
  sgstPercent,
  sgstAmount,
  grandTotal,
  hasRoomCoupon,
  couponCode,
  setCouponCode,
  setCouponApplied,
}) {
  const summaryImage =
    room?.images?.length > 0
      ? resolveImageUrl(room.images[0])
      : resolveImageUrl(room?.image || room?.coverImage) || null;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="border-b px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-red-700" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-base">Payment Summary</h3>
            <p className="text-xs text-muted-foreground">
              Review the final payable amount for this reservation
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4 text-sm">
        <div className="flex md:w-[320px] items-center gap-3 rounded-xl border border-[#efe7e1] bg-[#fcfaf8] p-3">
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {summaryImage ? (
              <img
                src={summaryImage}
                alt={room?.name || "Room"}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate font-sans text-[15px] font-semibold text-[#2A201B]">
              {room?.name}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Karjat, Maharashtra</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{totalGuests} Guests</span>
          </div>

          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            <span>
              {room.mealMode === "only"
                ? "Meals Included"
                : withMeal
                  ? "With Meals"
                  : "Without Meals"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#faf7f4] rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">
              CHECK-IN
            </div>
            <div className="font-medium">
              {range?.from && format(range.from, "dd MMM yyyy")}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {range?.from
                ? `${format(range.from, "EEEE")}, ${CHECK_IN_TIME}`
                : CHECK_IN_TIME}
            </div>
          </div>

          <div className="bg-[#faf7f4] rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">
              CHECK-OUT
            </div>
            <div className="font-medium">
              {range?.to && format(range.to, "dd MMM yyyy")}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {range?.to
                ? `${format(range.to, "EEEE")}, ${CHECK_OUT_TIME}`
                : CHECK_OUT_TIME}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>
              {INRExact(
                nights > 0
                  ? roomChargeTotal / nights
                  : room?.taxMode === "included"
                    ? roomPricing.averageBasePerNight
                    : roomPricing.averageGrossPerNight
              )} x {nights} nights
            </span>
            <span className="font-semibold text-[#2A201B]">{INR(roomChargeTotal)}</span>
          </div>

          {room.mealMode === "price" && withMeal && (
            <div className="flex justify-between">
              <span>Meals</span>
              <span className="font-semibold text-[#2A201B]">{INR(mealTotal)}</span>
            </div>
          )}

          {couponDiscountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Coupon Discount</span>
              <span>-{INR(couponDiscountAmount)}</span>
            </div>
          )}

          {weekendDiscountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>
                Weekend Discount ({weekendEligibleNights} night{weekendEligibleNights === 1 ? "" : "s"} @ {weekendOffer?.percent || 0}%)
              </span>
              <span>-{INR(weekendDiscountAmount)}</span>
            </div>
          )}

          {specialOfferAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>
                Special Offer ({specialOfferEligibleNights} night{specialOfferEligibleNights === 1 ? "" : "s"} @ {Number(specialOffer?.discountPercent || 0)}%)
              </span>
              <span>-{INR(specialOfferAmount)}</span>
            </div>
          )}

          {(weekendDiscountAmount > 0 || specialOfferAmount > 0) && (
            <p className="text-xs text-muted-foreground">
              Discounts are calculated only on eligible nights within the selected stay.
            </p>
          )}

          {room.mealMode === "only" && (
            <div className="flex justify-between text-green-700">
              <span>Meals</span>
              <span className="font-semibold">Included</span>
            </div>
          )}

          <div className="flex flex-col justify-between text-muted-foreground">
            <div className="flex justify-between">
              <span>CGST ({cgstPercent}%)</span>
              <span className="font-semibold text-[#2A201B]">{INR(cgstAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>SGST ({sgstPercent}%)</span>
              <span className="font-semibold text-[#2A201B]">{INR(sgstAmount)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {hasRoomCoupon && (
          <>
            <div className="space-y-2">
              <Label>Promo Code</Label>

              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) =>
                    setCouponCode(e.target.value.toUpperCase())
                  }
                  placeholder="Enter promo code"
                />

                <Button
                  type="button"
                  onClick={() => {
                    if (couponCode === room.discountCode) {
                      setCouponApplied(true);
                      toast.success(`${room.discountLabel || "Offer"} applied!`);
                    } else {
                      setCouponApplied(false);
                      toast.error("Invalid code for this room");
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>

            <Separator />
          </>
        )}

        <div className="flex justify-between items-end">
          <div>
            <div className="text-[18px] font-medium">Total</div>
            <div className="text-xs text-muted-foreground">
              Including all taxes
            </div>
          </div>

          <div className="text-xl font-semibold text-red-600">
            {INR(grandTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutMealSection({
  room,
  withMealState,
  withMeal,
  vegGuests,
  setVegGuests,
  nonVegGuests,
  setNonVegGuests,
  totalGuests,
}) {
  if (!(room?.mealMode === "only" || room?.mealMode === "price")) {
    return null;
  }

  return (
    <div className="rounded-2xl border bg-white p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
          <Utensils className="h-5 w-5 text-red-700" />
        </div>
        <div>
          <h3 className="font-sans font-semibold text-base">Meal Preferences</h3>
          <p className="text-xs text-muted-foreground">
            Customize meal selection for this reservation
          </p>
        </div>
      </div>

      <Label className="flex items-center gap-2">
        <Checkbox
          checked={withMealState}
          disabled
          className="border-red-600 bg-red-600 text-white opacity-100 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600 disabled:cursor-not-allowed disabled:opacity-100"
        />
        <span className="flex items-center gap-1">
          <Utensils className="w-4 h-4" />
          Meals Included
        </span>
      </Label>

      {withMeal && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Meal Assurance:</span> All guest meals are pre-arranged with a focus on quality, hygiene, and comfort.
        </div>
      )}

      {room.mealMode === "only" && (
        <div className="rounded-xl border bg-green-50 px-4 py-3 text-sm text-green-700">
          Meals are included in the room price for all guests.
        </div>
      )}

      {room.mealMode === "price" && (
        <div className="rounded-xl border bg-green-50 px-4 py-3 text-sm text-green-700">
          Meals are mandatory for this stay. Please choose veg and non-veg guest counts.
        </div>
      )}

      {withMeal && (
        <div className="rounded-xl border bg-[#faf7f4] px-4 pb-3 pt-3 space-y-3">
          {room.mealMode === "price" ? (
            <>
              <p className="text-xs text-muted-foreground">
                Meal prices are per guest per night
              </p>

              <div className="flex justify-between text-sm">
                <span>Veg Meal</span>
                <span>₹{room.mealPriceVeg} / guest / night</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Non-Veg Meal</span>
                <span>₹{room.mealPriceNonVeg} / guest / night</span>
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Veg Guests</div>
              <div className="rounded-xl border px-3 py-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setVegGuests(Math.max(0, vegGuests - 1))}
                    disabled={vegGuests <= 0}
                    className="h-8 w-8 rounded-full border text-lg disabled:opacity-40"
                  >
                    -
                  </button>

                  <span className="text-sm font-semibold w-6 text-center">
                    {vegGuests}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const nextValue = vegGuests + 1;
                      if (nextValue + nonVegGuests > totalGuests) {
                        setVegGuests(totalGuests - nonVegGuests);
                      } else {
                        setVegGuests(nextValue);
                      }
                    }}
                    disabled={vegGuests >= totalGuests || vegGuests + nonVegGuests >= totalGuests}
                    className="h-8 w-8 rounded-full border text-lg disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Non Veg Guests</div>
              <div className="rounded-xl border px-3 py-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setNonVegGuests(Math.max(0, nonVegGuests - 1))}
                    disabled={nonVegGuests <= 0}
                    className="h-8 w-8 rounded-full border text-lg disabled:opacity-40"
                  >
                    -
                  </button>

                  <span className="text-sm font-semibold w-6 text-center">
                    {nonVegGuests}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const nextValue = nonVegGuests + 1;
                      if (vegGuests + nextValue > totalGuests) {
                        setNonVegGuests(totalGuests - vegGuests);
                      } else {
                        setNonVegGuests(nextValue);
                      }
                    }}
                    disabled={nonVegGuests >= totalGuests || vegGuests + nonVegGuests >= totalGuests}
                    className="h-8 w-8 rounded-full border text-lg disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Meal Guests Selected: <strong>{vegGuests + nonVegGuests}</strong> / {totalGuests}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, init, phoneLogin } = useAuth();

  const roomId = state?.roomId;

  const initialAdults = Number(state?.adults ?? 1);
  const initialChildren = Number(state?.children ?? 0);

  const [room, setRoom] = useState(null);
  const [allRooms, setAllRooms] = useState([]);
  const [capacityPopupOpen, setCapacityPopupOpen] = useState(false);

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
  });

  const [address, setAddress] = useState({
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);
  const toYMD = (d) => (d ? format(new Date(d), "yyyy-MM-dd") : null);

  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const totalGuests = adults + children;
  const [withMealState, setWithMealState] = useState(true);
  const withMeal =
    room?.mealMode === "only" || room?.mealMode === "price";

  const [vegGuests, setVegGuests] = useState(0);
  const [nonVegGuests, setNonVegGuests] = useState(0);

  const [range, setRange] = useState({
    from: state?.startDate ? new Date(state.startDate) : null,
    to: state?.endDate ? new Date(state.endDate) : null,
  });

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [specialOffer, setSpecialOffer] = useState(null);
  const hasRoomCoupon =
    room &&
    room.discountType &&
    room.discountType !== "none" &&
    room.discountCode &&
    room.discountCode.trim() !== "";

  const disabledAll = useMemo(
    () => mergeRanges([...blackoutRanges, ...bookedAll]),
    [blackoutRanges, bookedAll]
  );

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

  const [taxPercent, setTaxPercent] = useState(0);
  const [weekendDiscountConfig, setWeekendDiscountConfig] = useState({
    weekendDiscountEnabled: false,
    twoWeekendNightsDiscountPercent: 0,
    threeWeekendNightsDiscountPercent: 0,
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [otpStep, setOtpStep] = useState("idle");
  const [otp, setOtp] = useState("");
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const pendingProceedRef = useRef(false);

  const countries = getAllCountries();
  const statesList = address.country
    ? getStatesByCountry(address.country)
    : [];
  const citiesList =
    address.country && address.state
      ? getCitiesByState(address.country, address.state)
      : [];

  useEffect(() => {
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
  }, []);


  useEffect(() => {
    if (state === undefined) return;
    if (!state?.roomId) {
      navigate("/", { replace: true });
      return;
    }
    api.get(`/rooms/${state.roomId}`).then(({ data }) => setRoom(data));
    api.get("/rooms").then(({ data }) => setAllRooms(data || []));
  }, [state, navigate]);


  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      dob: user.dob ? new Date(user.dob) : null,
    });

    setAddress({
      address: user.address || "",
      country: user.country || "",
      state: user.state || "",
      city: user.city || "",
      pincode: user.pincode || "",
    });

    setOtpStep("verified");
  }, [user]);


  useEffect(() => {
    setWithMealState(room?.mealMode === "only" || room?.mealMode === "price");
  }, [room?.mealMode]);

  useEffect(() => {
    if (!withMeal) return;

    const totalMeal = vegGuests + nonVegGuests;

    if (totalMeal === 0 && totalGuests > 0) {
      setVegGuests(1);
      setNonVegGuests(0);
    }

    if (totalMeal > totalGuests) {
      setNonVegGuests(Math.max(0, totalGuests - vegGuests));
    }
  }, [totalGuests, withMeal]);

  useEffect(() => {
    api.get("/tax")
      .then(({ data }) => {
        setTaxPercent(data.taxPercent);
        setWeekendDiscountConfig({
          weekendDiscountEnabled: Boolean(data.weekendDiscountEnabled),
          twoWeekendNightsDiscountPercent: Number(
            data.twoWeekendNightsDiscountPercent || 0
          ),
          threeWeekendNightsDiscountPercent: Number(
            data.threeWeekendNightsDiscountPercent || 0
          ),
        });
      })
      .catch(() => {
        toast.error("Failed to load tax configuration");
      });
  }, []);

  useEffect(() => {
    api.get("/auth/me/special-offer")
      .then(({ data }) => {
        setSpecialOffer(data || null);
      })
      .catch(() => {
        setSpecialOffer(null);
      });
  }, []);


  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;

    const diff =
      (toDateOnly(range.to) - toDateOnly(range.from)) /
      (1000 * 60 * 60 * 24);

    return Math.max(0, Math.round(diff));
  }, [range]);


  const roomPricing = useMemo(
    () => getRoomPricingBreakdown(room, range, taxPercent, totalGuests),
    [room, range, taxPercent, totalGuests]
  );

  const weekendOffer = useMemo(() => {
    if (!range?.from || !range?.to) {
      return null;
    }
    return getWeekendOfferState(range, weekendDiscountConfig, disabledAll);
  }, [disabledAll, range, weekendDiscountConfig]);

  const hasAppliedCoupon = useMemo(
    () =>
      Boolean(
        hasRoomCoupon &&
          couponApplied &&
          couponCode === room?.discountCode
      ),
    [couponApplied, couponCode, hasRoomCoupon, room?.discountCode]
  );

  const hasApplicableSpecialOffer = useMemo(
    () =>
      Boolean(
        specialOffer?.discountPercent &&
          doesOfferOverlapSelectedStay(specialOffer, range) &&
          getOfferEligibleNights(specialOffer, range) > 0
      ),
    [range, specialOffer]
  );

  const shouldRoundIncludedRoomSubtotal = useMemo(
    () =>
      room?.taxMode === "included" &&
      Boolean(weekendOffer?.eligible || hasAppliedCoupon || hasApplicableSpecialOffer),
    [hasApplicableSpecialOffer, hasAppliedCoupon, room?.taxMode, weekendOffer?.eligible]
  );

  const roomTotal = useMemo(() => {
    if (!room) return 0;
    return shouldRoundIncludedRoomSubtotal
      ? Math.round(Number(roomPricing.baseTotal || 0))
      : Number(roomPricing.baseTotal || 0);
  }, [room, roomPricing.baseTotal, shouldRoundIncludedRoomSubtotal]);

  const roomChargeTotal = useMemo(() => {
    return roomTotal;
  }, [roomTotal]);

  const mealTotal = useMemo(() => {
    if (!room) return 0;
    if (room.mealMode === "only") return 0;
    if (room.mealMode === "price" && withMeal) {
      return (
        nights *
        (vegGuests * room.mealPriceVeg +
          nonVegGuests * room.mealPriceNonVeg)
      );
    }
    return 0;
  }, [room, nights, withMeal, vegGuests, nonVegGuests]);

  const subTotal = useMemo(() => {
    return roomChargeTotal + mealTotal;
  }, [roomChargeTotal, mealTotal]);

  const couponDiscountAmount = useMemo(() => {
    if (!hasRoomCoupon) return 0;
    if (!couponApplied) return 0;
    if (couponCode !== room.discountCode) return 0;

    const couponBaseAmount = subTotal;

    if (room.discountType === "percent") {
      return Math.round((couponBaseAmount * room.discountValue) / 100);
    }

    if (room.discountType === "flat") {
      return room.discountValue || 0;
    }

    return 0;
  }, [hasRoomCoupon, couponApplied, couponCode, room, subTotal]);

  const weekendDiscountAmount = useMemo(() => {
    if (!weekendOffer?.eligible) return 0;
    if (roomPricing.weekendNights <= 0 || !room) return 0;
    const eligibleWeekendSubtotal = roomPricing.weekendBaseTotal;
    return Math.round((eligibleWeekendSubtotal * weekendOffer.percent) / 100);
  }, [room, roomPricing, weekendOffer]);

  const weekendEligibleNights = useMemo(
    () => weekendOffer?.eligibleNights || 0,
    [weekendOffer]
  );

  const specialOfferEligibleNights = useMemo(
    () => getOfferEligibleNights(specialOffer, range),
    [range, specialOffer]
  );

  const specialOfferAmount = useMemo(() => {
    if (!specialOffer?.discountPercent) return 0;
    if (!doesOfferOverlapSelectedStay(specialOffer, range)) return 0;
    if (specialOfferEligibleNights <= 0 || nights <= 0) return 0;
    const subtotalAfterOtherDiscounts = Math.max(
      0,
      subTotal - couponDiscountAmount - weekendDiscountAmount
    );
    const eligibleOfferSubtotal =
      (subtotalAfterOtherDiscounts * specialOfferEligibleNights) / nights;
    return Math.round(
      (eligibleOfferSubtotal * Number(specialOffer.discountPercent || 0)) / 100
    );
  }, [
    couponDiscountAmount,
    nights,
    specialOffer,
    specialOfferEligibleNights,
    subTotal,
    weekendDiscountAmount,
  ]);

  const discountAmount = useMemo(() => {
    return couponDiscountAmount + weekendDiscountAmount + specialOfferAmount;
  }, [couponDiscountAmount, weekendDiscountAmount, specialOfferAmount]);

  const discountedSubtotal = useMemo(() => {
    return Math.max(0, subTotal - discountAmount);
  }, [subTotal, discountAmount]);

  const taxableAmount = useMemo(() => {
    return discountedSubtotal;
  }, [discountedSubtotal]);

  const cgstPercent = taxPercent / 2;
  const sgstPercent = taxPercent / 2;

  const cgstAmount = useMemo(() => {
    if (!room) return 0;
    return Number(((taxableAmount * cgstPercent) / 100).toFixed(2));
  }, [room, taxableAmount, cgstPercent]);


  const sgstAmount = useMemo(() => {
    if (!room) return 0;
    return Number(((taxableAmount * sgstPercent) / 100).toFixed(2));
  }, [room, taxableAmount, sgstPercent]);

  const totalTax = useMemo(() => cgstAmount + sgstAmount, [cgstAmount, sgstAmount]);

  const originalCgstAmount = useMemo(() => {
    if (!room) return 0;
    return Number(((subTotal * cgstPercent) / 100).toFixed(2));
  }, [room, subTotal, cgstPercent]);

  const originalSgstAmount = useMemo(() => {
    if (!room) return 0;
    return Number(((subTotal * sgstPercent) / 100).toFixed(2));
  }, [room, subTotal, sgstPercent]);

  const originalTotalTax = useMemo(
    () => originalCgstAmount + originalSgstAmount,
    [originalCgstAmount, originalSgstAmount]
  );

  const grandTotal = useMemo(() => {
    if (!room) return 0;
    const payableAmount = taxableAmount + totalTax;
    return room.taxMode === "included"
      ? Math.round(payableAmount)
      : Number(payableAmount.toFixed(2));
  }, [room, taxableAmount, totalTax]);

  const originalGrandTotal = useMemo(() => {
    if (!room) return 0;
    const payableAmount = subTotal + originalTotalTax;
    return room.taxMode === "included"
      ? Math.round(payableAmount)
      : Number(payableAmount.toFixed(2));
  }, [room, subTotal, originalTotalTax]);

  const pricingSummaryProps = useMemo(
    () => ({
      room,
      range,
      nights,
      grandTotal,
      originalGrandTotal,
      roomChargeTotal,
      weekendDiscountAmount,
      weekendEligibleNights,
      weekendOffer,
      totalTax,
    }),
    [
      grandTotal,
      nights,
      originalGrandTotal,
      subTotal,
      range,
      room,
      roomChargeTotal,
      totalTax,
      weekendDiscountAmount,
      weekendEligibleNights,
      weekendOffer,
    ]
  );

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

  const handleCapacityMaxAttempt = () => {
    setCapacityPopupOpen(true);
  };

  const goToSuggestedRoom = (targetRoomId) => {
    setCapacityPopupOpen(false);
    navigate(`/room/${targetRoomId}`, {
      state: {
        range: {
          from: range?.from || null,
          to: range?.to || null,
        },
        adults,
        children,
      },
    });
  };

  const goToEntireVilla = () => {
    sessionStorage.setItem(
      "searchParams",
      JSON.stringify({
        range: {
          from: range?.from || null,
          to: range?.to || null,
        },
        adults,
        children,
      })
    );
    setCapacityPopupOpen(false);
    navigate("/entire-villa-form");
  };


  const proceedPayment = async () => {
    if (processingPayment) return;
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions to continue");
      return;
    }
    setProcessingPayment(true);
    const g = totalGuests;

    if (room.mealMode === "price" && withMeal) {
      const mealGuests = vegGuests + nonVegGuests;

      if (mealGuests < 1) {
        toast.error("Please select at least 1 guest for meals");
        setProcessingPayment(false);
        return;
      }

      if (mealGuests > g) {
        toast.error("Meal guests cannot exceed total guests");
        return;
      }
    }


    if (!form.email || !form.email.trim()) {
      toast.error("Email is required for booking confirmation");
      return;
    }

    const { data: availability } = await api.post("/bookings/check-availability", {
      roomId,
      startDate: toYMD(range.from),
      endDate: toYMD(range.to),
    });

    if (!availability.available) {
      toast.error("Sorry, these dates were just booked by another guest.");
      setProcessingPayment(false);
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok) {
      toast.error("Failed to load payment gateway");
      setProcessingPayment(false);
      return;
    }
    const { data } = await api.post("/payments/create-order", {
      roomId,
      startDate: toYMD(range.from),
      endDate: toYMD(range.to),
      guests: g,
      adults,
      children,
      withMeal,
      vegGuests,
      nonVegGuests,
      contactName: form.name,
      contactEmail: form.email,
      contactPhone: form.phone,
      couponCode,
    });

    const rzp = new window.Razorpay({
      key: data.key,
      amount: data.amount,
      currency: "INR",
      name: room.name,
      description: `${room.name} booking`,
      order_id: data.orderId,

      prefill: {
        name: form.name || "",
        email: form.email || "",
        contact: String(form.phone || ""),
      },

      notes: {
        roomId,
        guests: String(g),
      },

      handler: async (resp) => {
        let toastId;

        try {
          toastId = toast.loading("Confirming your booking...");

          const countryObj = countries.find(
            (c) => c.isoCode === address.country
          );

          const stateObj = statesList.find(
            (s) => s.isoCode === address.state
          );

          const { data } = await api.post("/payments/verify", {
            ...resp,
            roomId,
            startDate: toYMD(range.from),
            endDate: toYMD(range.to),
            nights,
            pricePerNight: room.pricePerNight,
            roomTotal,
            mealTotal,
            amount: grandTotal,
            taxBreakup: {
              cgstPercent,
              sgstPercent,
              cgstAmount,
              sgstAmount,
              totalTax,
            },
            discountMeta: discountAmount > 0 ? {
              discountType: room.discountType,
              discountValue: room.discountValue,
              discountAmount,
              couponDiscountAmount,
              weekendDiscountEnabled: Boolean(weekendOffer?.eligible),
              weekendDiscountPercent: weekendOffer?.eligible
                ? weekendOffer.percent
                : 0,
              weekendDiscountAmount,
              specialOfferId: specialOffer?._id || null,
              specialOfferPercent: Number(specialOffer?.discountPercent || 0),
              specialOfferAmount,
              specialOfferMessage: specialOffer?.message || "",
            } : null,
            guests: g,
            adults,
            children,
            withMeal,
            vegGuests,
            nonVegGuests,
            contactName: form.name,
            contactEmail: form.email,
            contactPhone: form.phone,
            address: address.address || null,
            country: countryObj?.name || null,
            state: stateObj?.name || null,
            city: address.city || null,
            pincode: address.pincode || null,
          });

          toast.success("Booking confirmed 🎉", { id: toastId });

          sessionStorage.removeItem("searchParams");
          navigate(`/booking-success/${data.booking._id}`, {
            replace: true,
          });
        } catch (err) {
          console.error("Payment verified but booking failed:", err);

          // ❌ replace loading toast with error
          toast.error(
            "Payment successful, but booking confirmation failed. Please contact support.",
            { id: toastId }
          );
        }
      },


      modal: {
        ondismiss: () => {
          toast.info("Payment cancelled");
        },
      },

      theme: {
        color: "#BA081C",
      },
    });

    rzp.open();
    setProcessingPayment(false);
  };


  const proceed = async () => {
    if (!acceptedTerms) {
      setPolicyDialogOpen(true);
      return;
    }
    if (!user) {
      pendingProceedRef.current = true;
      if (otpStep === "idle") sendOtp();
      return toast.info("Verify mobile number to continue");
    }
    proceedPayment();
  };

  if (!room) return null;

  const roomImage =
    room?.images?.length > 0
      ? room.images[0]
      : room?.image || room?.coverImage || null;


  function ReadOnlyField({ label, value, icon: Icon }) {
    if (!value) return null;

    return (
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <div className="flex items-start gap-2">
          {Icon && (
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          )}
          <p className="text-sm font-medium text-foreground break-words">
            {value}
          </p>
        </div>
      </div>
    );
  }


  function Counter({
    label,
    value,
    min = 0,
    max = Infinity,
    onChange,
    helper,
    onMaxAttempt,
  }) {
    const decrement = () => onChange(Math.max(min, value - 1));
    const increment = () => {
      if (value < max) {
        onChange(Math.min(max, value + 1));
        return;
      }
      onMaxAttempt?.();
    };
    const isIncrementDisabled = value >= max && !onMaxAttempt;

    return (
      <div className="space-y-1">
        <Label>{label}</Label>

        <div className="flex items-center justify-between rounded-xl border px-3 py-2">
          <button
            type="button"
            onClick={decrement}
            disabled={value <= min}
            className="h-8 w-8 rounded-full border text-lg disabled:opacity-40"
          >
            −
          </button>

          <span className="text-sm font-semibold w-6 text-center">
            {value}
          </span>

          <button
            type="button"
            onClick={increment}
            disabled={isIncrementDisabled}
            className="h-8 w-8 rounded-full border text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>

        {helper && (
          <p className="text-xs text-muted-foreground">{helper}</p>
        )}
      </div>
    );
  }


  function MobileRoomCard({ room, image }) {
    if (!room) return null;

    return (
      <div className="lg:hidden">
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm">
          {/* IMAGE */}
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
            {image && (
              <img
                src={image}
                alt={room.name}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* CONTENT */}
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight">
              {room.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ref: {room._id?.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const policyLinks = [
    { label: "Terms & Conditions", to: "/terms" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Refund & Cancellation", to: "/refund" },
    { label: "Pool Safety Guidelines", to: "/pool-safety" },
    { label: "House Rules", to: "/house-rules" },
  ];

  return (
    <div className="bg-[#fbfbfb]">
      <div className="max-w-7xl mx-auto px-4 py-6 md:mb-[0px] mb-[70px]">
        {/* reCAPTCHA – hidden, no layout impact */}
        <div
          id="recaptcha-container"
          className="absolute inset-0 opacity-0 pointer-events-none"
        />
        {/* ================= CHECKOUT STEPS ================= */}
        <div className="w-full flex justify-center mb-5">
          <div
            className="
      flex items-center
      gap-1 sm:gap-4
      overflow-x-auto sm:overflow-visible
      px-2
    "
          >

            {/* STEP 1 — COMPLETED */}
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 min-w-[90px] sm:min-w-0">
              <div className="h-8 w-8 rounded-full bg-red-700 text-white flex items-center justify-center text-sm font-semibold mt-1">
                ✓
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">
                Select Room
              </span>
            </div>

            {/* CONNECTOR */}
            <div className=" flex w-10 h-[1px] sm:block sm:w-20 sm:h-[2px] bg-red-700" />

            {/* STEP 2 — ACTIVE */}
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 min-w-[90px] sm:min-w-0">
              <div className="h-8 w-8 rounded-full bg-red-700 text-white ring-4 ring-red-100 flex items-center justify-center text-sm font-semibold mt-1">
                2
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">
                Guest Details
              </span>
            </div>

            {/* CONNECTOR */}
            <div className="flex w-10 h-[1px] sm:block sm:w-20 sm:h-[2px] bg-muted" />

            {/* STEP 3 — UPCOMING */}
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 min-w-[90px] sm:min-w-0">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground text-center">
                Payment
              </span>
            </div>

          </div>
        </div>

        {/* BACK BUTTON */}
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-l hover:opacity-100 bg-black/10 p-2 rounded-[8px] pr-4 w-fit flex gap-1 ml-2"
          >
            <ArrowUpLeft className="text-black/60" />Back
          </button>
        </div>

        <div className="flex justify-between items-start gap-4">

          <section className="lg:w-[62%] space-y-6">
            {/* ================= MOBILE ROOM CARD ================= */}
            <div className="lg:hidden">
              <MobileRoomCard room={room} image={roomImage} />
              <Separator className="mt-4" />
            </div>
            {/* ================= PERSONAL INFORMATION ================= */}
            <div className="rounded-2xl border bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-base">Guest Details</h3>
                  <p className="text-xs text-muted-foreground">
                    Information provided for this reservation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ReadOnlyField
                  label="Full Name"
                  value={form.name}
                  icon={User}
                />

                <ReadOnlyField
                  label="Email Address"
                  value={form.email}
                  icon={Mail}
                />

                <ReadOnlyField
                  label="Date of Birth"
                  value={form.dob ? format(form.dob, "dd MMM yyyy") : ""}
                  icon={CalendarIcon}
                />

                <ReadOnlyField
                  label="Phone Number"
                  value={form.phone}
                  icon={Phone}
                />
              </div>
            </div>

            {/* ================= ADDRESS DETAILS ================= */}
            <div className="rounded-2xl border bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-base">Address Details</h3>
                  <p className="text-xs text-muted-foreground">
                    Billing address for this reservation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* STREET ADDRESS — FULL ROW (mobile + desktop) */}
                <div className="col-span-2 md:col-span-4">
                  <ReadOnlyField
                    label="Street Address"
                    value={address.address}
                    icon={Home}
                  />
                </div>

                {/* COUNTRY */}
                <ReadOnlyField
                  label="Country"
                  value={address.country}
                />

                {/* STATE */}
                <ReadOnlyField
                  label="State"
                  value={address.state}
                />

                {/* CITY */}
                <ReadOnlyField
                  label="City"
                  value={address.city}
                />

                {/* PINCODE */}
                <ReadOnlyField
                  label="Pincode"
                  value={address.pincode}
                />

              </div>

            </div>

            <CheckoutMealSection
              room={room}
              withMealState={withMealState}
              setWithMealState={setWithMealState}
              withMeal={withMeal}
              vegGuests={vegGuests}
              setVegGuests={setVegGuests}
              nonVegGuests={nonVegGuests}
              setNonVegGuests={setNonVegGuests}
              totalGuests={totalGuests}
            />

            <CheckoutRoomSummaryCard
              room={room}
              totalGuests={totalGuests}
              withMeal={withMeal}
              range={range}
              nights={nights}
              roomPricing={roomPricing}
              roomChargeTotal={roomChargeTotal}
              mealTotal={mealTotal}
              couponDiscountAmount={couponDiscountAmount}
              weekendDiscountAmount={weekendDiscountAmount}
              weekendEligibleNights={weekendEligibleNights}
              weekendOffer={weekendOffer}
              specialOfferAmount={specialOfferAmount}
              specialOfferEligibleNights={specialOfferEligibleNights}
              specialOffer={specialOffer}
              cgstPercent={cgstPercent}
              cgstAmount={cgstAmount}
              sgstPercent={sgstPercent}
              sgstAmount={sgstAmount}
              grandTotal={grandTotal}
              hasRoomCoupon={hasRoomCoupon}
              couponCode={couponCode}
              setCouponCode={setCouponCode}
              setCouponApplied={setCouponApplied}
            />

            {/* ================= BOOKING PREFERENCES ================= */}
            <div className="lg:hidden">
              <CheckoutSidebarBookingCard
                room={room}
                roomId={roomId}
                range={range}
                setRange={setRange}
                disabledRanges={disabledAll}
                adults={adults}
                setAdults={(v) => {
                  setAdults(v);
                  setVegGuests(0);
                  setNonVegGuests(0);
                }}
                children={children}
                setChildren={(v) => {
                  setChildren(v);
                  setVegGuests(0);
                  setNonVegGuests(0);
                }}
                weekendOffer={weekendOffer}
                pricingSummaryProps={pricingSummaryProps}
                onMaxAttempt={handleCapacityMaxAttempt}
                onProceed={proceed}
                processingPayment={processingPayment}
                acceptedTerms={acceptedTerms}
                showProceedButton={false}
                paymentMethodsPosition="after-guests"
                fullWidthOfferButton
              />
            </div>

            <div className="rounded-2xl border bg-white p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setPolicyDialogOpen(true)}
                className="flex w-full items-start gap-3 text-left"
              >
                <Checkbox
                  checked={acceptedTerms}
                  className="mt-0.5 pointer-events-none"
                  aria-hidden="true"
                />
                <span className="text-sm text-foreground">
                  I accept the{" "}
                  <span className="font-medium text-red-700">
                    terms and conditions
                  </span>
                </span>
              </button>

              <p className="mt-2 text-xs text-muted-foreground">
                Clicking this opens the policy popup. Payment stays disabled until
                acceptance is completed there.
              </p>
            </div>

            {/* ================= MOBILE FIXED CTA ================= */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t px-4 py-3">
              <Button
                disabled={processingPayment || !acceptedTerms}
                className="w-full h-12 text-base bg-red-700 hover:bg-red-800 disabled:bg-gray-300 disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={proceed}
              >
                {processingPayment ? "Processing..." : "Proceed to Payment"}
              </Button>
            </div>

            <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
              <DialogContent className="max-w-md rounded-2xl border border-border bg-white p-0 text-foreground">
                <DialogHeader className="px-6 pt-6 text-left">
                  <DialogTitle className="text-[22px] font-semibold text-foreground">
                    Policies
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Review the policies below before continuing to payment.
                  </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 pt-2">
                  <div className="space-y-3">
                    {policyLinks.map((policy) => (
                      <Link
                        key={policy.to}
                        to={policy.to}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[16px] text-foreground transition-colors hover:text-red-700"
                      >
                        {policy.label}
                      </Link>
                    ))}
                  </div>

                  <Separator className="my-5" />

                  <Label className="flex items-start gap-3 text-sm text-foreground">
                    <Checkbox
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => {
                        setAcceptedTerms(Boolean(checked));
                        setPolicyDialogOpen(false);
                      }}
                      className="mt-0.5 border-red-700 data-[state=checked]:bg-red-700 data-[state=checked]:text-white"
                    />
                    <span>I accept terms and conditions</span>
                  </Label>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Once accepted, the checkbox on checkout will stay checked and
                    payment will be enabled.
                  </p>
                </div>
              </DialogContent>
            </Dialog>


          </section>


          {/* ================= DESKTOP STICKY SUMMARY ================= */}
          <aside className="hidden lg:block lg:w-[36%] lg:sticky lg:top-[70px] self-start">
            <div className="px-4 py-0 mt-5">

              <div className="mb-5">
                <CheckoutSidebarBookingCard
                  room={room}
                  roomId={roomId}
                  range={range}
                  setRange={setRange}
                  disabledRanges={disabledAll}
                  adults={adults}
                  setAdults={(v) => {
                    setAdults(v);
                    setVegGuests(0);
                    setNonVegGuests(0);
                  }}
                  children={children}
                  setChildren={(v) => {
                    setChildren(v);
                    setVegGuests(0);
                    setNonVegGuests(0);
                  }}
                  totalGuests={totalGuests}
                  weekendOffer={weekendOffer}
                  pricingSummaryProps={pricingSummaryProps}
                  withMealState={withMealState}
                  setWithMealState={(v) => {
                    setWithMealState(Boolean(v));
                    setVegGuests(0);
                    setNonVegGuests(0);
                  }}
                  withMeal={withMeal}
                  roomMealMode={room.mealMode}
                  vegGuests={vegGuests}
                  setVegGuests={setVegGuests}
                  nonVegGuests={nonVegGuests}
                  setNonVegGuests={setNonVegGuests}
                  roomMealPriceVeg={room.mealPriceVeg}
                  roomMealPriceNonVeg={room.mealPriceNonVeg}
                  onMaxAttempt={handleCapacityMaxAttempt}
                  onProceed={proceed}
                  processingPayment={processingPayment}
                  acceptedTerms={acceptedTerms}
                />
              </div>

            </div>
          </aside>


        </div>

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
                  Room Capacity Reached
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-[#2A201B]">
                  This room&apos;s max guest capacity is {room?.maxGuests}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#6d5c52]">
                  Please select another room for more guests, or choose the entire villa for your group.
                </p>
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
                        Entire Villa
                      </div>
                      <div className="text-sm text-white/85">
                        Reserve all rooms for larger groups
                      </div>
                    </div>
                    <ArrowUpLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

