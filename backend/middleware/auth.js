import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    if (!token)
      return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      isAdmin: !!decoded.isAdmin,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "TokenExpired" });
    }

    return res.status(401).json({ message: "Unauthorized" });
  }
}


function sendAuthError(req, res, message) {
  if (req.originalUrl.startsWith("/api/invoice")) {
    return res
      .status(401)
      .set("Content-Type", "text/plain")
      .send(message);
  }

  return res.status(401).json({
    code: "AUTH_REQUIRED",
    message,
  });
}
