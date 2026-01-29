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