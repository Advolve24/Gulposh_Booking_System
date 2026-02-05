import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const normalizeEmail = (e = "") => String(e).trim().toLowerCase();

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

   const user = await User
  .findOne({
    email: normalizeEmail(email),
    isAdmin: true,
    passwordHash: { $exists: true }
  })
  .select("+passwordHash");


    if (!user)
  return res.status(400).json({ message: "Admin account not found" });

if (!user.isAdmin)
  return res.status(403).json({ message: "Admins only" });

if (!user.passwordHash)
  return res.status(400).json({ message: "Admin password not set" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "60m" }
    );

    res.cookie("admin_token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
  domain: ".villagulposh.com", 
  maxAge: 60 * 60 * 1000,
});


res.json({
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: true,
  },
});

  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    res.status(500).json({ message: "Admin login failed" });
  }
};


export const adminLogout = (_req, res) => {
  res.clearCookie("admin_token", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
  domain: ".villagulposh.com", 
});

  res.json({ message: "Logged out" });
};


export const adminMe = async (req, res) => {
  const u = await User.findById(req.user.id).select("name email isAdmin");
  if (!u?.isAdmin) return res.status(403).json({ message: "Admins only" });
  res.json({ id: u._id, name: u.name, email: u.email, isAdmin: true });
};
