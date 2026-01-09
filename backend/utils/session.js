// utils/session.js

export const COOKIE_BASE = {
  httpOnly: true,
  secure: false,           // localhost
  sameSite: "none",        // REQUIRED for cross-origin
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
