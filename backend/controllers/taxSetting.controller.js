import TaxSetting from "../models/TaxSetting.js";

export const getActiveTax = async (_req, res) => {
  try {
    const settings = await TaxSetting.findOne().select(
      "taxPercent weekendDiscountEnabled weekendDiscountPercent"
    );

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Tax configuration not found",
      });
    }

    return res.json({
      success: true,
      taxPercent: Number(settings.taxPercent || 0),
      weekendDiscountEnabled: !!settings.weekendDiscountEnabled,
      weekendDiscountPercent: Number(settings.weekendDiscountPercent || 0),
    });
  } catch (err) {
    console.error("getActiveTax error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tax configuration",
    });
  }
};

export const updateTax = async (req, res) => {
  try {
    const { taxPercent } = req.body || {};

    if (
      taxPercent === undefined ||
      typeof taxPercent !== "number" ||
      taxPercent < 0 ||
      taxPercent > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid tax percent (0-100 required)",
      });
    }

    const settings = await TaxSetting.findOneAndUpdate(
      {},
      {
        $set: { taxPercent },
        $setOnInsert: {
          weekendDiscountEnabled: false,
          weekendDiscountPercent: 0,
        },
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: "Tax updated successfully",
      taxPercent: Number(settings.taxPercent || 0),
    });
  } catch (err) {
    console.error("updateTax error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update tax configuration",
    });
  }
};

export const getDiscountConfig = async (_req, res) => {
  try {
    const settings = await TaxSetting.findOne().select(
      "weekendDiscountEnabled weekendDiscountPercent"
    );

    return res.json({
      success: true,
      weekendDiscountEnabled: !!settings?.weekendDiscountEnabled,
      weekendDiscountPercent: Number(settings?.weekendDiscountPercent || 0),
    });
  } catch (err) {
    console.error("getDiscountConfig error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch discount configuration",
    });
  }
};

export const updateDiscountConfig = async (req, res) => {
  try {
    const { weekendDiscountEnabled, weekendDiscountPercent } = req.body || {};

    if (typeof weekendDiscountEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "weekendDiscountEnabled must be true or false",
      });
    }

    const parsedPercent = Number(weekendDiscountPercent ?? 0);
    if (!Number.isFinite(parsedPercent) || parsedPercent < 0 || parsedPercent > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount percent (0-100 required)",
      });
    }

    const settings = await TaxSetting.findOneAndUpdate(
      {},
      {
        $set: {
          weekendDiscountEnabled,
          weekendDiscountPercent: weekendDiscountEnabled ? parsedPercent : 0,
        },
        $setOnInsert: {
          taxPercent: 0,
        },
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: "Discount updated successfully",
      weekendDiscountEnabled: !!settings.weekendDiscountEnabled,
      weekendDiscountPercent: Number(settings.weekendDiscountPercent || 0),
    });
  } catch (err) {
    console.error("updateDiscountConfig error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update discount configuration",
    });
  }
};
