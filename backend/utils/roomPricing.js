const MS_PER_DAY = 86400000;

const toUtcDateOnly = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
};

const getGuestPricingCounts = (room, guestInfo = 0) => {
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
};

export const isWeekendNight = (value) => {
  const date = toUtcDateOnly(value);
  if (!date) return false;

  const day = date.getUTCDay();
  return day === 5 || day === 6 || day === 0;
};

export const getExtraGuestCount = (room, guests = 0) => {
  return getGuestPricingCounts(room, guests).extraGuestCount;
};

export const getRoomNightPrice = (room, value, guests = 0) => {
  const weekdayPrice = Number(room?.pricePerNight || 0);
  const weekendPrice = Number(room?.weekendPricePerNight || weekdayPrice);
  const { baseGuests, extraAdultCount, extraChildCount } =
    getGuestPricingCounts(room, guests);
  const weekdayExtraGuestFee = weekdayPrice / baseGuests;
  const weekendExtraGuestFee = weekendPrice / baseGuests;

  return isWeekendNight(value)
    ? weekendPrice +
        extraAdultCount * weekendExtraGuestFee +
        extraChildCount * weekendExtraGuestFee * 0.5
    : weekdayPrice +
        extraAdultCount * weekdayExtraGuestFee +
        extraChildCount * weekdayExtraGuestFee * 0.5;
};

export const getRoomPricingBreakdown = (room, startDate, endDate, guests = 0) => {
  const start = toUtcDateOnly(startDate);
  const end = toUtcDateOnly(endDate);
  const weekdayBasePrice = Number(room?.pricePerNight || 0);
  const weekendBasePrice = Number(
    room?.weekendPricePerNight || room?.pricePerNight || 0
  );
  const {
    baseGuests,
    extraGuestCount,
    extraAdultCount,
    extraChildCount,
    totalGuests,
  } = getGuestPricingCounts(room, guests);
  const weekdayExtraGuestFee = weekdayBasePrice / baseGuests;
  const weekendExtraGuestFee = weekendBasePrice / baseGuests;
  const weekdayPricePerNight =
    weekdayBasePrice +
    extraAdultCount * weekdayExtraGuestFee +
    extraChildCount * weekdayExtraGuestFee * 0.5;
  const weekendPricePerNight =
    weekendBasePrice +
    extraAdultCount * weekendExtraGuestFee +
    extraChildCount * weekendExtraGuestFee * 0.5;

  if (!room || !start || !end || end <= start) {
    return {
      nights: 0,
      weekdayNights: 0,
      weekendNights: 0,
      weekdayPricePerNight,
      weekendPricePerNight,
      weekdayBasePrice,
      weekendBasePrice,
      baseGuests,
      extraGuestCount,
      extraAdultCount,
      extraChildCount,
      averagePricePerNight: weekdayPricePerNight,
      roomTotal: 0,
    };
  }

  let nights = 0;
  let weekdayNights = 0;
  let weekendNights = 0;
  let roomTotal = 0;

  for (
    let cursor = new Date(start);
    cursor < end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    nights += 1;

    if (isWeekendNight(cursor)) {
      weekendNights += 1;
      roomTotal += weekendPricePerNight;
    } else {
      weekdayNights += 1;
      roomTotal += weekdayPricePerNight;
    }
  }

  return {
    nights,
    weekdayNights,
    weekendNights,
    weekdayPricePerNight,
    weekendPricePerNight,
    weekdayBasePrice,
    weekendBasePrice,
    baseGuests,
    extraGuestCount,
    extraAdultCount,
    extraChildCount,
    averagePricePerNight: nights > 0 ? Number((roomTotal / nights).toFixed(2)) : 0,
    roomTotal,
  };
};

export const getRoomPricingMeta = (room, startDate, endDate, guests = 0) => {
  const breakdown = getRoomPricingBreakdown(room, startDate, endDate, guests);
  const guestCount =
    typeof guests === "object" && guests !== null
      ? Number(
          guests.guests !== undefined
            ? guests.guests
            : Number(guests.adults || 0) + Number(guests.children || 0)
        )
      : Math.max(0, Number(guests || 0));

  return {
    weekdayPricePerNight: breakdown.weekdayPricePerNight,
    weekendPricePerNight: breakdown.weekendPricePerNight,
    weekdayNights: breakdown.weekdayNights,
    weekendNights: breakdown.weekendNights,
    baseGuests: breakdown.baseGuests,
    guestCount,
  };
};
