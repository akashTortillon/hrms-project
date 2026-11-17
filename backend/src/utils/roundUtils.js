// Single rounding helper for money AND day counts, so a value like 35.0000001 or
// 30.333333333 never reaches the DB, an export or the UI. Non-finite input becomes 0
// and -0 is normalised to 0.
export const round2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  const r = Math.round((x + Number.EPSILON) * 100) / 100;
  return r === 0 ? 0 : r;
};

// Sum of items where every item is rounded first, then the total is rounded too.
export const sumRound2 = (items = [], pick = (x) => x) =>
  round2(items.reduce((s, i) => s + round2(pick(i)), 0));

// Display string, always 2 decimals with thousands separators.
export const fmtMoney = (n) =>
  round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
