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
    persistent = false,
    days = 7,
    domain,
  } = {}
) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(name, value, {
    httpOnly: true,

    /**
     * REQUIRED for iOS + Google OAuth
     * Safari drops SameSite=None cookies unless secure=true
     */
    secure: true,

    /**
     * OAuth-safe configuration
     */
    sameSite: "none",

    /**
     * Path & domain
     */
    path,
    ...(domain ? { domain } : {}),

    /**
     * Expiry
     */
    ...(persistent
      ? { maxAge: days * 24 * 60 * 60 * 1000 }
      : {}),
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
