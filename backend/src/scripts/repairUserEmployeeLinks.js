// One-time repair utility for the "payslip not visible" class of bug: a User
// account whose employeeId was never linked to its Employee record (most
// commonly rows imported via importEmployees before that path backfilled the
// link - see employeeController.js's importEmployees for the fix at the source).
//
// This script only REPORTS ambiguous cases (more than one Employee shares the
// same email - Employee.email has no unique constraint, unlike User.email) -
// it never guesses which one to link. Unambiguous single-match cases get linked.
//
// Run manually only: `node src/scripts/repairUserEmployeeLinks.js`
// Run against a dev DB copy first. Only run against production with the user's
// explicit sign-off - it writes to the User collection.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/userModel.js';
import Employee from '../models/employeeModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    } catch (error) {
        console.error("DB Connection Error:", error.message);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    const unlinkedUsers = await User.find({
        role: { $ne: "Admin" },
        $or: [{ employeeId: null }, { employeeId: { $exists: false } }]
    });

    console.log(`Found ${unlinkedUsers.length} non-Admin User(s) with no employeeId link.\n`);

    const linked = [];
    const noMatch = [];
    const ambiguous = [];

    for (const user of unlinkedUsers) {
        if (!user.email) {
            noMatch.push({ userId: user._id, email: null, reason: "User has no email" });
            continue;
        }

        // Case-insensitive exact match - same lookup authMiddleware.js's protect
        // uses for its own runtime auto-heal.
        const matches = await Employee.find({ email: new RegExp(`^${user.email}$`, "i") });

        if (matches.length === 0) {
            noMatch.push({ userId: user._id, email: user.email });
        } else if (matches.length > 1) {
            ambiguous.push({
                userId: user._id,
                email: user.email,
                candidateEmployeeIds: matches.map((m) => m._id.toString())
            });
        } else {
            await User.updateOne({ _id: user._id }, { $set: { employeeId: matches[0]._id } });
            linked.push({ userId: user._id, email: user.email, employeeId: matches[0]._id.toString() });
        }
    }

    console.log(`Linked: ${linked.length}`);
    linked.forEach((r) => console.log(`  - ${r.email} -> Employee ${r.employeeId}`));

    console.log(`\nNo Employee match (needs manual review - create/link the Employee record): ${noMatch.length}`);
    noMatch.forEach((r) => console.log(`  - ${r.email || "(no email)"} (User ${r.userId})`));

    console.log(`\nAmbiguous - multiple Employee docs share this email, NOT auto-linked (needs manual review): ${ambiguous.length}`);
    ambiguous.forEach((r) => console.log(`  - ${r.email} (User ${r.userId}) candidates: ${r.candidateEmployeeIds.join(", ")}`));

    console.log("\nDone.");
    process.exit();
};

run();
