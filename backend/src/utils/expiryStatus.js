// Shared expiry bucketing so dashboard stats and reports agree, and so status
// reflects "today" rather than whatever was stored at upload time.
export const computeExpiryStatus = (expiryDate) => {
  if (!expiryDate) return "Valid";
  const diffDays = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Expired";
  if (diffDays <= 10) return "Critical";
  if (diffDays <= 30) return "Expiring Soon";
  return "Valid";
};
