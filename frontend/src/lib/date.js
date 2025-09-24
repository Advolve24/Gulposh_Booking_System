// src/lib/date.js
export const toDateOnly = (dLike) => {
  const d = new Date(dLike);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const toDateOnlyFromAPI = (s) => {
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// NEW: use UTC parts from an ISO date string (great for bookings coming from DB)
export const toDateOnlyFromAPIUTC = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
export const todayDateOnly = () => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
};

export const addDays = (d, n) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
