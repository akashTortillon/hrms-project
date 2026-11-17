// Mirror of backend/src/utils/roundUtils.js - one rounding rule for money and day counts.
export const round2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  const r = Math.round((x + Number.EPSILON) * 100) / 100;
  return r === 0 ? 0 : r;
};

// Display string, always 2 decimals with thousands separators.
export const fmtMoney = (n) =>
  round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Day counts: whole numbers stay whole, halves/fractions show at most 2 decimals.
export const fmtDays = (n) => String(round2(n));
