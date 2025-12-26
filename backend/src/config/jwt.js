export const jwtConfig = {
  secret: process.env.JWT_SECRET || "supersecretkey",
  expiresIn: "1d",
};
