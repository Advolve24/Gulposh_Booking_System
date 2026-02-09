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

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    path,
    ...(domain ? { domain } : {}),

    ...(persistent
      ? { maxAge: days * 24 * 60 * 60 * 1000 }
      : {}),


  });
}

export function clearSessionCookie(
  res,
  name,
  { path = "/", domain } = {}
) {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",

    path,
    ...(domain ? { domain } : {}),

  });
}
