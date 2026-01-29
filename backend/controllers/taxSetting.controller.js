import TaxSetting from "../models/TaxSetting.js";

/* ================= GET ACTIVE ================= */
export const getActiveTaxSetting = async (_req, res) => {
  try {
    let tax = await TaxSetting.findOne({ isActive: true }).lean();

    // fallback default
    if (!tax) {
      tax = {
        withoutFood: { stayTaxPercent: 0 },
        withFood: { stayTaxPercent: 0, foodTaxPercent: 0 },
      };
    }

    res.json(tax);
  } catch (err) {
    console.error("getActiveTaxSetting error:", err);
    res.status(500).json({ message: "Failed to load tax settings" });
  }
};

/* ================= UPDATE ================= */
export const updateTaxSetting = async (req, res) => {
  try {
    const {
      withoutFood,
      withFood,
    } = req.body || {};

    // deactivate old
    await TaxSetting.updateMany(
      { isActive: true },
      { $set: { isActive: false } }
    );

    const tax = await TaxSetting.create({
      withoutFood: {
        stayTaxPercent: Number(withoutFood?.stayTaxPercent || 0),
      },
      withFood: {
        stayTaxPercent: Number(withFood?.stayTaxPercent || 0),
        foodTaxPercent: Number(withFood?.foodTaxPercent || 0),
      },
      isActive: true,
    });

    res.json({ ok: true, tax });
  } catch (err) {
    console.error("updateTaxSetting error:", err);
    res.status(500).json({ message: "Failed to update tax settings" });
  }
};