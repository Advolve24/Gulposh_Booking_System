import jwt from "jsonwebtoken";

export function requireAdminSession(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

    const token = req.cookies?.admin_token || bearer;
    if (!token) return res.status(401).json({ message: "Admin auth required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ message: "Admins only" });

    req.user = { id: decoded.id, email: decoded.email, isAdmin: true };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
