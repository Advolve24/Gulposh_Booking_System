export function setSessionCookie(
  res,
  name,
  value,
  { path = "/", persistent = false, days = 7 } = {}
) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path,
    maxAge: persistent ? days * 24 * 60 * 60 * 1000 : undefined,
  });
}

export function clearSessionCookie(res, name, { path = "/" } = {}) {
  res.clearCookie(name, {
    path,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
}
