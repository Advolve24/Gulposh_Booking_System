export const toDateOnly = (dLike) => {
  const d = new Date(dLike);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const toDateOnlyFromAPI = (s) => {
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

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

export const toLocalDateInputValue = (value) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateOnlyUTC = (
  value,
  locale = "en-GB",
  options = {}
) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
};
