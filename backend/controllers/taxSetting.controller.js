import TaxSetting from "../models/TaxSetting.js";

export const getActiveTax = async (req, res) => {
  try {
    // Only ONE document exists
    const tax = await TaxSetting.findOne().select("taxPercent");

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: "Tax configuration not found",
      });
    }

    return res.json({
      success: true,
      taxPercent: tax.taxPercent, // 👈 this is what frontend needs
    });
  } catch (err) {
    console.error("❌ getActiveTax error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tax configuration",
    });
  }
};


/**
 * PUT /api/admin/tax
 * Admin – update tax percent
 */
export const updateTax = async (req, res) => {
  try {
    const { taxPercent } = req.body;

    if (
      taxPercent === undefined ||
      typeof taxPercent !== "number" ||
      taxPercent < 0 ||
      taxPercent > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid tax percent (0–100 required)",
      });
    }

    // Only one document exists → update or create
    const tax = await TaxSetting.findOneAndUpdate(
      {},
      { taxPercent },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: "Tax updated successfully",
      taxPercent: tax.taxPercent,
    });
  } catch (err) {
    console.error("❌ updateTax error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update tax configuration",
    });
  }
};