export const jwtConfig = {
  secret: process.env.JWT_SECRET || "supersecretkey",
  expiresIn: "15m", // Access token short-lived
  refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret_key_12345",
  refreshExpiresIn: "7d", // Refresh token long-lived
};
