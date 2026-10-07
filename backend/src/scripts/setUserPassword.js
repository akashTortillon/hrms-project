/**
 * Checks - and optionally sets - one login account's password straight in the database, for
 * when "Reset Password" output can't be copied/typed reliably or a login keeps failing with
 * 401 and you need to know whether the stored password is the one you think it is.
 *
 * SAFE BY DEFAULT: DRY RUN - looks the account up exactly like the login does (email,
 * case-insensitive), prints what it found, and says whether the given password matches the
 * stored one. Writes nothing. Pass --live to set the password (and force a password change
 * at next login, and sign out existing sessions).
 *
 * Note the app logs in with the EMAIL only - an employee code like EMP004 is not accepted.
 *
 * Usage:
 *   node src/scripts/setUserPassword.js --email=person@example.com --password='Temp#12345'          # check only
 *   node src/scripts/setUserPassword.js --email=person@example.com --password='Temp#12345' --live   # set it
 * (single quotes keep the shell from touching characters like ! $ & in the password)
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/userModel.js";
import Employee from "../models/employeeModel.js";
import { emailMatchFilter, normalizeEmail } from "../utils/emailUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const valueOf = (name) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
};
const EMAIL = valueOf("email");
const PASSWORD = valueOf("password");
const DB_URI = valueOf("uri") || process.env.DB_URL;

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Usage: node src/scripts/setUserPassword.js --email=<login email> --password='<password>' [--live]");
    process.exit(1);
  }

  await mongoose.connect(DB_URI);
  console.log(`Database: ${mongoose.connection.db.databaseName}`);
  console.log(`Mode: ${LIVE ? "LIVE (will set the password)" : "DRY RUN (no writes)"}`);

  // Same lookup as authController.login
  const users = await User.find(emailMatchFilter(EMAIL));

  if (users.length === 0) {
    console.log(`\nNo login account has the email "${normalizeEmail(EMAIL)}". Login will answer 401 "Invalid credentials" for it.`);

    // Near misses: accounts whose email merely CONTAINS the part before the @. A stored email
    // with a trailing space or look-alike character prints identically in most tools, so show
    // it as a JSON string with its length and any non-plain-ASCII characters.
    const local = normalizeEmail(EMAIL).split("@")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const near = await User.find({ email: { $regex: new RegExp(local, "i") } }).select("email role employeeId");
    if (near.length) {
      console.log("\nSimilar accounts (raw stored value):");
      for (const u of near) {
        const odd = [...u.email].filter((c) => c.charCodeAt(0) < 33 || c.charCodeAt(0) > 126)
          .map((c) => "U+" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));
        console.log(`  ${JSON.stringify(u.email)}  length ${u.email.length}  role ${u.role}  employeeId ${u.employeeId}${odd.length ? "  <-- unexpected characters: " + odd.join(" ") : ""}`);
      }
    } else {
      console.log("No similar accounts either.");
    }
    await mongoose.disconnect();
    return;
  }
  if (users.length > 1) {
    console.log(`\nWARNING: ${users.length} accounts match this email - login uses whichever MongoDB returns first.`);
  }

  for (const user of users) {
    const employee = user.employeeId ? await Employee.findById(user.employeeId).select("code name email status") : null;
    const matches = await bcrypt.compare(PASSWORD, user.password);
    console.log(`\nAccount: ${user.email}  (role: ${user.role}, mustChangePassword: ${user.mustChangePassword})`);
    console.log(`Linked employee: ${employee ? `${employee.code} ${employee.name} (${employee.status}, email ${employee.email})` : "none / link broken"}`);
    console.log(`Given password matches the stored one: ${matches ? "YES" : "NO"}`);

    if (LIVE) {
      user.password = await bcrypt.hash(PASSWORD, 10);
      user.mustChangePassword = true;
      user.refreshTokens = []; // sign out any existing sessions
      await user.save();
      console.log("-> Password set. They must change it at next login. Existing sessions were signed out.");
    }
  }

  if (!LIVE) console.log("\nDRY RUN - nothing changed. Re-run with --live to set this password.");
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
