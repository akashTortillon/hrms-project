/**
 * backfill-working-day-type.mjs
 *
 * PURPOSE:
 *   Migrates the old per-employee `weekOffDay` field (a single fixed weekday,
 *   0=Sunday..6=Saturday) to the new Working Day Type model:
 *     workingDayType: 4 (one recurring weekday/week - the direct equivalent of the
 *                        old model), weekOffDays: [<old weekOffDay value>]
 *   Employees who never had a non-default `weekOffDay` set (i.e. it's still the
 *   Sunday=0 default, or the field was never present) are left on the new schema's
 *   own default (workingDayType: 4, weekOffDays: [0]) - functionally identical, no
 *   migration needed for them.
 *
 *   The old `weekOffDay` field is no longer in the Mongoose schema as of this
 *   change, but MongoDB doesn't delete data just because a schema stops declaring
 *   a field - it would sit around forever as dead data unless explicitly removed.
 *   This script both migrates the value AND unsets the old field.
 *
 * USAGE:
 *   node scripts/backfill-working-day-type.mjs            # Preview mode (no DB writes)
 *   node scripts/backfill-working-day-type.mjs --apply     # Apply migration to DB
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env
 */

import "dotenv/config";
import mongoose from "mongoose";

const DB_URL = process.env.DB_URL;
const MODE = process.argv.includes("--apply") ? "apply" : "preview";

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

  // Raw collection access, not the Mongoose model - the model no longer declares
  // `weekOffDay`, so `Employee.find()` wouldn't even return it in results.
  const collection = mongoose.connection.collection("employees");

  const withOldField = await collection.find({ weekOffDay: { $exists: true } }).toArray();
  console.log(`Found ${withOldField.length} employee(s) with the old weekOffDay field present.\n`);

  let toMigrate = 0;
  let alreadyDefault = 0;
  let updated = 0;
  let failed = 0;
  const sampleMigrations = [];

  for (const doc of withOldField) {
    const oldValue = doc.weekOffDay;
    const isNonDefault = typeof oldValue === "number" && oldValue !== 0;

    if (isNonDefault) {
      toMigrate++;
      if (sampleMigrations.length < 10) {
        sampleMigrations.push({
          code: doc.code,
          name: doc.name,
          oldWeekOffDay: oldValue,
          newWorkingDayType: 4,
          newWeekOffDays: [oldValue]
        });
      }
    } else {
      alreadyDefault++;
    }

    if (MODE === "apply") {
      try {
        const update = isNonDefault
          ? { $set: { workingDayType: 4, weekOffDays: [oldValue] }, $unset: { weekOffDay: "" } }
          : { $unset: { weekOffDay: "" } }; // still clear the dead field even for default-value docs
        await collection.updateOne({ _id: doc._id }, update);
        updated++;
      } catch (err) {
        failed++;
        console.error(`Failed to update ${doc._id}: ${err.message}`);
      }
    }
  }

  console.log("Sample migrations (first 10, non-default weekOffDay only):");
  console.log(JSON.stringify(sampleMigrations, null, 2));

  console.log(`\nSummary:`);
  console.log(`  Employees with old field:     ${withOldField.length}`);
  console.log(`  Needed real migration (non-Sunday): ${toMigrate}`);
  console.log(`  Already at default (Sunday):  ${alreadyDefault}`);

  if (MODE === "apply") {
    console.log(`  Updated:                      ${updated}`);
    console.log(`  Failed:                       ${failed}`);
    console.log(`\nDone.`);
  } else {
    console.log(`\nPreview only - no DB writes made.`);
    console.log(`Run with --apply to migrate these ${withOldField.length} record(s):`);
    console.log(`    node scripts/backfill-working-day-type.mjs --apply`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
