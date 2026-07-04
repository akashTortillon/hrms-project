// One-time migration: existing employees only have `code` (now user-editable).
// Backfill `systemCode` from their current `code` so the internal auto-generated
// reference number is preserved even if `code` gets changed later.
// Run: node src/scripts/backfillSystemCode.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Employee from '../models/employeeModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  await mongoose.connect(process.env.DB_URL);

  const employees = await Employee.find({
    $or: [{ systemCode: { $exists: false } }, { systemCode: null }]
  }).select('code systemCode');

  let updated = 0;
  for (const emp of employees) {
    if (!emp.code) continue;
    await Employee.updateOne({ _id: emp._id }, { $set: { systemCode: emp.code } });
    updated++;
  }

  console.log(`Backfilled systemCode for ${updated} of ${employees.length} employees.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
