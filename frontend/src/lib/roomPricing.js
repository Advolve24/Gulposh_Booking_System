function normalizeDateStart(dateLike) {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isWeekendNight(date) {
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0;
}

export function getRoomPricingBreakdown(room, range, taxPercent = 0) {
  const stayStart = normalizeDateStart(range?.from);
  const stayEndExclusive = normalizeDateStart(range?.to);

  const weekdayGrossPerNight = Number(room?.pricePerNight || 0);
  const weekendGrossPerNight = Number(
    room?.weekendPricePerNight || room?.pricePerNight || 0
  );

  if (!room || !stayStart || !stayEndExclusive || stayEndExclusive <= stayStart) {
    return {
      nights: 0,
      weekdayNights: 0,
      weekendNights: 0,
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
    grossTotal: Number(grossTotal.toFixed(2)),
    baseTotal: Number(baseTotal.toFixed(2)),
    weekendGrossTotal: Number(weekendGrossTotal.toFixed(2)),
    weekendBaseTotal: Number(weekendBaseTotal.toFixed(2)),
    averageBasePerNight: Number((baseTotal / nights).toFixed(2)),
    averageGrossPerNight: Number((grossTotal / nights).toFixed(2)),
  };
}
