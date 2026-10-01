/**
 * Wipes every collection in the connected database - Masters, Employees, Attendance,
 * BiometricTransaction, Users, Requests, every other model, everything - for resetting
 * to a clean slate before a fresh import.
 *
 * SAFE BY DEFAULT: runs in DRY RUN - prints what would be deleted (collection names +
 * document counts), deletes nothing. Pass --live to actually delete.
 *
 * By default, `users` with role "Admin" are PRESERVED even in --live mode, so you don't
 * lock yourself out of the app - everyone else in `users` is deleted along with every
 * other collection. Pass --wipe-admins too if you genuinely want Admin accounts gone as
 * well (you will need to re-register + manually promote a new one via mongosh after).
 *
 * Usage:
 *   node src/scripts/wipeAllData.js                       # dry run
 *   node src/scripts/wipeAllData.js --live                 # wipe everything except Admin users
 *   node src/scripts/wipeAllData.js --live --wipe-admins    # wipe literally everything, Admins included
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const WIPE_ADMINS = args.includes("--wipe-admins");
const uriArg = args.find(a => a.startsWith("--uri="));
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL;

async function main() {
  await mongoose.connect(DB_URI);
  const dbName = mongoose.connection.db.databaseName;
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Database: ${dbName}`);
  console.log(`Mode: ${LIVE ? "LIVE (will delete)" : "DRY RUN (no writes)"}`);
  console.log(`Admin users: ${WIPE_ADMINS ? "WILL be deleted too" : "preserved"}`);

  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map(c => c.name).sort();

  let totalDocs = 0;
  for (const name of names) {
    const coll = mongoose.connection.db.collection(name);

    // Special-cased: never touch Admin-role users unless --wipe-admins was passed.
    const filter = (name === "users" && !WIPE_ADMINS) ? { role: { $ne: "Admin" } } : {};
    const count = await coll.countDocuments(filter);
    totalDocs += count;

    const note = (name === "users" && !WIPE_ADMINS) ? " (excluding Admin-role users)" : "";
    console.log(`  ${name}: ${count} document(s) would be deleted${note}`);

    if (LIVE && count > 0) {
      await coll.deleteMany(filter);
    }
  }

  console.log(`\nTotal documents ${LIVE ? "deleted" : "that would be deleted"}: ${totalDocs}`);
  console.log(LIVE ? "\nLIVE MODE - all deletions above were applied." : "\nDRY RUN - nothing deleted. Re-run with --live to apply.");

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
