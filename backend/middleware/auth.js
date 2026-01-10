import jwt from "jsonwebtoken";

/* ===============================
   AUTH REQUIRED
================================ */
export function authRequired(req, res, next) {
  try {
    // Token from cookie OR Authorization header
    const hdr = req.headers.authorization || "";
    const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    const token = req.cookies?.token || bearer;

    if (!token) {
      return res.status(401).json({
        code: "AUTH_REQUIRED",
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      isAdmin: !!decoded.isAdmin,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        code: "TOKEN_EXPIRED",
        message: "Session expired",
      });
    }

    return res.status(401).json({
      code: "INVALID_TOKEN",
      message: "Invalid token",
    });
  }
}
