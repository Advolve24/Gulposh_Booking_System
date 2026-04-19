function normalizeDateStart(dateLike) {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getGuestPricingCounts(room, guestInfo = 0) {
  const baseGuests = Math.max(1, Number(room?.baseGuests || 1));
  const guestPayload =
    typeof guestInfo === "object" && guestInfo !== null
      ? guestInfo
      : { guests: guestInfo };
  const adults = Math.max(0, Number(guestPayload.adults || 0));
  const children = Math.max(0, Number(guestPayload.children || 0));
  const totalGuests = Math.max(
    0,
    Number(
      guestPayload.guests !== undefined
        ? guestPayload.guests
        : adults + children
    )
  );
  const extraGuestCount = Math.max(0, totalGuests - baseGuests);
  const extraChildCount = Math.min(children, extraGuestCount);
  const extraAdultCount = Math.max(0, extraGuestCount - extraChildCount);

  return {
    baseGuests,
    totalGuests,
    extraGuestCount,
    extraAdultCount,
    extraChildCount,
  };
}

export function isWeekendNight(date) {
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0;
}

export function getExtraGuestCount(room, guests = 0) {
  return getGuestPricingCounts(room, guests).extraGuestCount;
}

export function getRoomNightPrice(room, date, guests = 0) {
  const weekdayPrice = Number(room?.pricePerNight || 0);
  const weekendPrice = Number(room?.weekendPricePerNight || room?.pricePerNight || 0);
  const { baseGuests, extraAdultCount, extraChildCount } = getGuestPricingCounts(room, guests);
  const surcharge = isWeekendNight(date)
    ? (weekendPrice / baseGuests) * extraAdultCount +
      (weekendPrice / baseGuests) * 0.5 * extraChildCount
    : (weekdayPrice / baseGuests) * extraAdultCount +
      (weekdayPrice / baseGuests) * 0.5 * extraChildCount;

  return (isWeekendNight(date) ? weekendPrice : weekdayPrice) + surcharge;
}

export function getDisplayedNightlyPrices(room, guests = 0) {
  const weekdayBasePrice = Number(room?.pricePerNight || 0);
  const weekendBasePrice = Number(room?.weekendPricePerNight || room?.pricePerNight || 0);
  const { baseGuests, extraGuestCount, extraAdultCount, extraChildCount } =
    getGuestPricingCounts(room, guests);
  const weekdayAdultFee = weekdayBasePrice / baseGuests;
  const weekendAdultFee = weekendBasePrice / baseGuests;

  return {
    weekdayPrice:
      weekdayBasePrice +
      weekdayAdultFee * extraAdultCount +
      weekdayAdultFee * 0.5 * extraChildCount,
    weekendPrice:
      weekendBasePrice +
      weekendAdultFee * extraAdultCount +
      weekendAdultFee * 0.5 * extraChildCount,
    baseGuests,
    extraGuestCount,
    extraAdultCount,
    extraChildCount,
  };
}

export function getRoomPricingBreakdown(room, range, taxPercent = 0, guests = 0) {
  const stayStart = normalizeDateStart(range?.from);
  const stayEndExclusive = normalizeDateStart(range?.to);

  const weekdayBasePrice = Number(room?.pricePerNight || 0);
  const weekendBasePrice = Number(
    room?.weekendPricePerNight || room?.pricePerNight || 0
  );
  const {
    baseGuests,
    extraGuestCount,
    extraAdultCount,
    extraChildCount,
  } = getGuestPricingCounts(room, guests);
  const weekdayAdultFee = weekdayBasePrice / baseGuests;
  const weekendAdultFee = weekendBasePrice / baseGuests;
  const weekdayGrossPerNight =
    weekdayBasePrice +
    weekdayAdultFee * extraAdultCount +
    weekdayAdultFee * 0.5 * extraChildCount;
  const weekendGrossPerNight =
    weekendBasePrice +
    weekendAdultFee * extraAdultCount +
    weekendAdultFee * 0.5 * extraChildCount;

  if (!room || !stayStart || !stayEndExclusive || stayEndExclusive <= stayStart) {
    return {
      nights: 0,
      weekdayNights: 0,
      weekendNights: 0,
      weekdayBasePrice,
      weekendBasePrice,
      baseGuests,
      extraGuestCount,
      extraAdultCount,
      extraChildCount,
      grossTotal: 0,
      baseTotal: 0,
      weekendGrossTotal: 0,
      weekendBaseTotal: 0,
      averageBasePerNight: 0,
      averageGrossPerNight: 0,
    };
  }

  let nights = 0;
  let weekdayNights = 0;
  let weekendNights = 0;
  let grossTotal = 0;
  let baseTotal = 0;
  let weekendGrossTotal = 0;
  let weekendBaseTotal = 0;

  for (
    let cursor = new Date(stayStart);
    cursor < stayEndExclusive;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const weekendNight = isWeekendNight(cursor);
    const grossNightPrice = weekendNight
      ? weekendGrossPerNight
      : weekdayGrossPerNight;
    const baseNightPrice =
      room.taxMode === "included"
        ? grossNightPrice / (1 + Number(taxPercent || 0) / 100)
        : grossNightPrice;

    nights += 1;
    grossTotal += grossNightPrice;
    baseTotal += baseNightPrice;

    if (weekendNight) {
      weekendNights += 1;
      weekendGrossTotal += grossNightPrice;
      weekendBaseTotal += baseNightPrice;
    } else {
      weekdayNights += 1;
    }
  }

  return {
    nights,
    weekdayNights,
    weekendNights,
    weekdayBasePrice,
    weekendBasePrice,
    baseGuests,
    extraGuestCount,
    extraAdultCount,
    extraChildCount,
    grossTotal: Number(grossTotal.toFixed(2)),
    baseTotal: Number(baseTotal.toFixed(2)),
    weekendGrossTotal: Number(weekendGrossTotal.toFixed(2)),
    weekendBaseTotal: Number(weekendBaseTotal.toFixed(2)),
    averageBasePerNight: Number((baseTotal / nights).toFixed(2)),
    averageGrossPerNight: Number((grossTotal / nights).toFixed(2)),
  };
}
