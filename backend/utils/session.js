export function setSessionCookie(
  res,
  name,
  value,
  {
    path = "/",
    persistent = true,
    days = 7,
    domain,
  } = {}
) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,          // REQUIRED for sameSite:none
    sameSite: "none",
    path,
    ...(domain ? { domain } : {}),
    ...(persistent
      ? { maxAge: days * 24 * 60 * 60 * 1000 }
      : {}),               // ✅ session cookie if not persistent
  });
}

export function clearSessionCookie(
  res,
  name,
  { path = "/", domain } = {}
) {
  res.clearCookie(name, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path,
    ...(domain ? { domain } : {}),
  });
}
