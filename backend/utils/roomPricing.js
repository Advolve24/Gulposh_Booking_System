const MS_PER_DAY = 86400000;

const toUtcDateOnly = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
};

export const isWeekendNight = (value) => {
  const date = toUtcDateOnly(value);
  if (!date) return false;

  const day = date.getUTCDay();
  return day === 5 || day === 6 || day === 0;
};

export const getRoomNightPrice = (room, value) => {
  const weekdayPrice = Number(room?.pricePerNight || 0);
  const weekendPrice = Number(room?.weekendPricePerNight || weekdayPrice);

  return isWeekendNight(value) ? weekendPrice : weekdayPrice;
};

export const getRoomPricingBreakdown = (room, startDate, endDate) => {
  const start = toUtcDateOnly(startDate);
  const end = toUtcDateOnly(endDate);

  if (!room || !start || !end || end <= start) {
    return {
      nights: 0,
      weekdayNights: 0,
      weekendNights: 0,
      weekdayPricePerNight: Number(room?.pricePerNight || 0),
      weekendPricePerNight: Number(
        room?.weekendPricePerNight || room?.pricePerNight || 0
      ),
      averagePricePerNight: Number(room?.pricePerNight || 0),
      roomTotal: 0,
    };
  }

  const weekdayPricePerNight = Number(room?.pricePerNight || 0);
  const weekendPricePerNight = Number(
    room?.weekendPricePerNight || weekdayPricePerNight
  );

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
    averagePricePerNight: nights > 0 ? Number((roomTotal / nights).toFixed(2)) : 0,
    roomTotal,
  };
};

export const getRoomPricingMeta = (room, startDate, endDate) => {
  const breakdown = getRoomPricingBreakdown(room, startDate, endDate);

  return {
    weekdayPricePerNight: breakdown.weekdayPricePerNight,
    weekendPricePerNight: breakdown.weekendPricePerNight,
    weekdayNights: breakdown.weekdayNights,
    weekendNights: breakdown.weekendNights,
  };
};
