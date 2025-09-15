import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { requireAdminSession } from "../middleware/adminSession.js";

const router = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const fileFilter = (_req, file, cb) => {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image uploads are allowed"));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, 
});

router.use(requireAdminSession);

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const base =
    process.env.PUBLIC_URL ||
    `${req.protocol}://${req.get("host")}`;
  const url = `${base}/uploads/${req.file.filename}`;
  res.json({ url });
});

router.post("/upload/batch", upload.array("files", 24), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });
  const base =
    process.env.PUBLIC_URL ||
    `${req.protocol}://${req.get("host")}`;
  const urls = req.files.map((f) => `${base}/uploads/${f.filename}`);
  res.json({ urls });
});

export default router;
