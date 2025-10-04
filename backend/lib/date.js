export const toDateOnly = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const todayDateOnly = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

export const toDateOnlyFromAPI = (s) => {
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const addDays = (d, n) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const toDateOnlyFromAPIUTC = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export const toDateOnlyUTC = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

export const todayDateOnlyUTC = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

export const addDaysUTC = (d, n) => {
  if (!d) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
};

export function parseYMD(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)); 
}