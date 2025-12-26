import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};
