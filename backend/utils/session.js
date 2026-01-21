/**
 * Session Cookie Utilities
 * iOS + Safari + Google OAuth compatible
 */

export function setSessionCookie(
  res,
  name,
  value,
  {
    path = "/",
    persistent = true,   // 🔥 DEFAULT TRUE
    days = 7,
    domain,
  } = {}
) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path,
    ...(domain ? { domain } : {}),

    // ✅ ALWAYS persist unless explicitly disabled
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}


export function clearSessionCookie(
  res,
  name,
  {
    path = "/",
    domain,
  } = {}
) {
  res.clearCookie(name, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path,
    ...(domain ? { domain } : {}),
  });
}
