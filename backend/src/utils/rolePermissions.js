import Master from "../models/masterModel.js";
import { escapeRegex } from "./stringUtils.js";

// Single source of truth for "what permissions does this role name grant". Login, /auth/me
// and the request-auth middleware each used to build their own `^role$` regex - login and
// /auth/me left the role name unescaped (and untrimmed), so a role named e.g.
// "Payroll & Employee (Access)" never matched its own Master document there: the user
// logged in with permissions [] (sidebar empty) even though API calls, which go through
// the middleware's escaped lookup, still worked. Admin is always ["ALL"].
export const resolveRolePermissions = async (role) => {
  if (role === "Admin") return ["ALL"];
  const name = String(role || "").trim();
  if (!name) return [];
  const roleDef = await Master.findOne({ type: "ROLE", name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
  return roleDef?.permissions || [];
};
