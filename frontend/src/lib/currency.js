export const formatINR = (num) =>
  `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export const roundedRupee = (num) => Math.round(Number(num || 0));
