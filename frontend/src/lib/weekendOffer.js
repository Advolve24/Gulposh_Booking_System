function normalizeDateStart(dateLike) {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function analyzeWeekendStay(range) {
  if (!range?.from || !range?.to) return null;

  const stayStart = normalizeDateStart(range.from);
  const stayEndExclusive = normalizeDateStart(range.to);

  let fridayNights = 0;
  let saturdayNights = 0;
  let sundayNights = 0;

  for (
    let cursor = new Date(stayStart);
    cursor < stayEndExclusive;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const day = cursor.getDay();
    if (day === 5) fridayNights += 1;
    if (day === 6) saturdayNights += 1;
    if (day === 0) sundayNights += 1;
  }

  const weekendNights = fridayNights + saturdayNights + sundayNights;

  return {
    fridayNights,
    saturdayNights,
    sundayNights,
    weekendNights,
    stayStart,
    stayEndExclusive,
  };
}

export function getWeekendOfferState(range, config = {}) {
  const analysis = analyzeWeekendStay(range);
  if (!analysis) return null;

  const {
    weekendDiscountEnabled,
    twoWeekendNightsDiscountPercent,
    threeWeekendNightsDiscountPercent,
  } = config;

  if (!weekendDiscountEnabled) return null;

  const twoNightPercent = Number(twoWeekendNightsDiscountPercent || 0);
  const threeNightPercent = Number(threeWeekendNightsDiscountPercent || 0);
  const weekendNights = analysis.weekendNights;

  const eligiblePercent =
    weekendNights >= 3
      ? threeNightPercent
      : weekendNights >= 2
      ? twoNightPercent
      : 0;

  const missingFriday = analysis.fridayNights === 0;
  const missingSaturday = analysis.saturdayNights === 0;
  const missingSunday = analysis.sundayNights === 0;

  let suggestion = null;

  if (weekendNights === 0 && twoNightPercent > 0 && analysis.stayEndExclusive.getDay() === 5) {
    suggestion = {
      type: "upgrade-to-2",
      percent: twoNightPercent,
      targetWeekendNights: 2,
      targetCheckout: addDays(analysis.stayEndExclusive, 2),
      title: `Add Friday and Saturday nights and save ${twoNightPercent}%.`,
      buttonLabel: "Add Weekend Nights",
      bodyPrefix: "Extend checkout till",
    };
  }

  if (weekendNights < 2 && twoNightPercent > 0) {
    if (!suggestion && missingFriday && analysis.saturdayNights > 0) {
      suggestion = {
        type: "upgrade-to-2",
        percent: twoNightPercent,
        targetWeekendNights: 2,
        targetCheckout: addDays(analysis.stayEndExclusive, 1),
        title: `Add Sunday night and save ${twoNightPercent}%.`,
        buttonLabel: "Add Sunday and Save",
        bodyPrefix: "Extend checkout till",
      };
    } else if (!suggestion && missingSaturday && analysis.fridayNights > 0) {
      suggestion = {
        type: "upgrade-to-2",
        percent: twoNightPercent,
        targetWeekendNights: 2,
        targetCheckout: addDays(analysis.stayEndExclusive, 1),
        title: `Add Saturday night and save ${twoNightPercent}%.`,
        buttonLabel: "Add Saturday and Save",
        bodyPrefix: "Extend checkout till",
      };
    }
  }

  if (!suggestion && weekendNights === 2 && missingSunday && threeNightPercent > 0) {
    suggestion = {
      type: "upgrade-to-3",
      percent: threeNightPercent,
      targetWeekendNights: 3,
      targetCheckout: addDays(analysis.stayEndExclusive, 1),
      title: `Add Sunday night and save ${threeNightPercent}%.`,
      buttonLabel: "Add Sunday and Save",
      bodyPrefix: "Extend checkout till",
    };
  }

  return {
    weekendNights,
    eligible: eligiblePercent > 0,
    eligibleNights: weekendNights,
    percent: eligiblePercent,
    appliedTier: weekendNights >= 3 ? 3 : weekendNights >= 2 ? 2 : 0,
    canSuggest: Boolean(suggestion?.targetCheckout),
    suggestedCheckout: suggestion?.targetCheckout || null,
    suggestedCheckoutLabel: suggestion?.targetCheckout
      ? suggestion.targetCheckout.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "",
    suggestionTitle: suggestion?.title || "",
    suggestionButtonLabel: suggestion?.buttonLabel || "",
    suggestionBodyPrefix: suggestion?.bodyPrefix || "",
  };
}
