import Blackout from "../models/Blackout.js";

const toDateOnly = (d) => {
  const t = new Date(d);
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
};

export const listBlackouts = async (_req, res) => {
  const items = await Blackout.find().sort({ from: 1 });
  res.json(items);
};

export const createBlackout = async (req, res) => {
  const { from, to, note } = req.body || {};
  if (!from || !to) return res.status(400).json({ message: "from and to are required" });
  const item = await Blackout.create({
    from: toDateOnly(from),
    to:   toDateOnly(to),
    note: note || "",
  });
  res.status(201).json(item);
};

export const deleteBlackout = async (req, res) => {
  await Blackout.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
