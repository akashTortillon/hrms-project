import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  console.log("Auth header:", authHeader);
  console.log("Has Bearer prefix:", authHeader?.startsWith("Bearer "));

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Auth failed: Missing or invalid Bearer prefix");
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    console.log("Token extracted:", token ? "exists" : "missing");
    console.log("Token length:", token?.length || 0);
    
    const decoded = jwt.verify(token, jwtConfig.secret);
    console.log("Token decoded successfully:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    res.status(401).json({ message: "Token invalid" });
  }
};
