import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    const token = req.cookies?.token || bearer;

    if (!token) {
      return sendAuthError(req, res, "Authentication required");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      isAdmin: !!decoded.isAdmin,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendAuthError(req, res, "Session expired");
    }

    return sendAuthError(req, res, "Invalid token");
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
