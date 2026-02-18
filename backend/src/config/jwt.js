export const jwtConfig = {
  secret: process.env.JWT_SECRET || "supersecretkey",
  expiresIn: "1d", // Access token valid for 1 day
  refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret_key_12345",
  refreshExpiresIn: "7d", // Refresh token long-lived
};
