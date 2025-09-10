const IS_PROD = process.env.NODE_ENV === "production";

// If your front-end and back-end are on different domains in prod (Netlify + Render),
// set CROSS_SITE=true in prod to switch SameSite to "none" (required by browsers).
const CROSS_SITE = process.env.CROSS_SITE === "true";

export const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,                 // must be true for SameSite=None in prod
  sameSite: CROSS_SITE ? "none" : "lax",
};

/**
 * Set a session cookie.
 * - If `persistent` is false (default), NO maxAge is set → browser session cookie.
 * - If `persistent` is true, set maxAge in days (remember-me behavior).
 */
export function setSessionCookie(
  res,
  name,
  token,
  { path = "/", persistent = false, days = 7 } = {}
) {
  const opts = { ...COOKIE_BASE, path };
  if (persistent) {
    opts.maxAge = days * 24 * 60 * 60 * 1000;
  }
  res.cookie(name, token, opts);
}

export function clearSessionCookie(res, name, { path = "/" } = {}) {
  res.clearCookie(name, { ...COOKIE_BASE, path });
}
