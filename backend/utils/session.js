const IS_PROD = process.env.NODE_ENV === "production";
const CROSS_SITE = process.env.CROSS_SITE === "true";

export const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,                
  sameSite: CROSS_SITE ? "none" : "lax",
};


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
