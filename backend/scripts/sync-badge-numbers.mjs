/**
 * sync-badge-numbers.mjs
 *
 * PURPOSE:
 *   Calls the BioCloud API, extracts unique BadgeNumber → EmployeeName pairs,
 *   fuzzy-matches them against the Employee collection, and updates the
 *   `badgeNumber` field on each matched employee.
 *
 * USAGE:
 *   node scripts/sync-badge-numbers.mjs            # Preview mode (no DB writes)
 *   node scripts/sync-badge-numbers.mjs --apply    # Apply updates to DB
 *   node scripts/sync-badge-numbers.mjs --test     # Run test cases only
 *
 * ENVIRONMENT:
 *   Reads DB_URL, BIOCLOUD_API_URL, BIOCLOUD_API_TOKEN from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import fetch from "node-fetch";

// ─── Config ────────────────────────────────────────────────────────────────────

const BIOCLOUD_API_URL  = process.env.BIOCLOUD_API_URL  || "https://15.biocloud.me:8205";
const BIOCLOUD_API_TOKEN = process.env.BIOCLOUD_API_TOKEN || "d168b9ea529a4b44a8419e499fe16f3e";
const DB_URL            = process.env.DB_URL;

const MODE = process.argv.includes("--apply") ? "apply"
           : process.argv.includes("--test")  ? "test"
           : "preview";

// ─── Employee Schema (minimal) ─────────────────────────────────────────────────

const employeeSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  code:        { type: String, required: true },
  badgeNumber: { type: String, default: null }
}, { timestamps: true });

const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

// ─── Fuzzy Name Matching ────────────────────────────────────────────────────────

/**
 * Normalise a name for comparison:
 * uppercase, strip extra spaces, remove punctuation
 */
function normaliseName(name = "") {
  return name.toUpperCase().replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Simple word-overlap score between two normalised name strings.
 * Returns 0-1 where 1 is a perfect match.
 */
function nameSimilarity(a, b) {
  const wordsA = new Set(normaliseName(a).split(" "));
  const wordsB = new Set(normaliseName(b).split(" "));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / union.size;
}

/**
 * Find the best matching employee for a given name.
 * Returns { employee, score } or null if no match >= threshold.
 */
function findBestMatch(bioName, employees, threshold = 0.5) {
  let best = null;
  let bestScore = 0;

  for (const emp of employees) {
    const score = nameSimilarity(bioName, emp.name);
    if (score > bestScore) {
      bestScore = score;
      best = emp;
    }
  }

  if (bestScore >= threshold) {
    return { employee: best, score: bestScore };
  }
  return null;
}

// ─── BioCloud API ───────────────────────────────────────────────────────────────

async function fetchBioCloudTransactions(startDate, endDate, idFrom = 0) {
  const url = `${BIOCLOUD_API_URL}/api_gettransctions`;

  console.log(`\n📡  Calling BioCloud API...`);
  console.log(`    URL:       ${url}`);
  console.log(`    StartDate: ${startDate}`);
  console.log(`    EndDate:   ${endDate}`);
  console.log(`    IdFrom:    ${idFrom}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "token": BIOCLOUD_API_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      BadgeNumber: null,
      StartDate: startDate,
      EndDate: endDate,
      IdFrom: idFrom
    })
  });

  if (!response.ok) {
    throw new Error(`BioCloud API returned HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.result !== "Success") {
    throw new Error(`BioCloud API error: ${JSON.stringify(data)}`);
  }

  const transactions = Array.isArray(data.message) ? data.message : [];
  console.log(`    ✅  Received ${transactions.length} transactions\n`);
  return transactions;
}

/**
 * Extract unique BadgeNumber → EmployeeName map from transactions.
 * Keeps the most frequent name per badge (in case of duplicates).
 */
function extractBadgeMap(transactions) {
  const nameFreq = {}; // badgeNumber → { name → count }

  for (const txn of transactions) {
    const badge = txn.BadgeNumber?.trim();
    const name  = txn.EmployeeName?.trim();
    if (!badge || !name) continue;

    if (!nameFreq[badge]) nameFreq[badge] = {};
    nameFreq[badge][name] = (nameFreq[badge][name] || 0) + 1;
  }

  const badgeMap = {}; // badgeNumber → most-frequent EmployeeName
  for (const [badge, names] of Object.entries(nameFreq)) {
    badgeMap[badge] = Object.entries(names).sort((a, b) => b[1] - a[1])[0][0];
  }

  return badgeMap;
}

// ─── Main Script ────────────────────────────────────────────────────────────────

async function run() {
  if (!DB_URL) {
    console.error("❌  DB_URL is not set in .env");
    process.exit(1);
  }

  // Date range: last 30 days to get a wide sample of employees
  const now    = new Date();
  const past   = new Date(now);
  past.setDate(past.getDate() - 30);

  const pad = n => String(n).padStart(2, "0");
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const startDate = `${fmt(past)} 00:00:00`;
  const endDate   = `${fmt(now)} 23:59:59`;

  // Connect DB
  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`    ✅  Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

  // Fetch all employees
  const employees = await Employee.find({}).lean();
  console.log(`👥  Loaded ${employees.length} employees from database\n`);

  // Fetch BioCloud data
  const transactions = await fetchBioCloudTransactions(startDate, endDate);

  if (transactions.length === 0) {
    console.log("⚠️   No transactions returned. Try a wider date range.");
    await mongoose.disconnect();
    return;
  }

  // Extract unique badge → name map
  const badgeMap = extractBadgeMap(transactions);
  const badges   = Object.entries(badgeMap); // [[badgeNumber, EmployeeName], ...]

  console.log(`🔍  Found ${badges.length} unique badge numbers in BioCloud data\n`);
  console.log("─".repeat(90));
  console.log(
    "  Badge No".padEnd(12) +
    "  BioCloud Name".padEnd(35) +
    "  Matched Employee".padEnd(30) +
    "  Score   Status"
  );
  console.log("─".repeat(90));

  const toUpdate    = []; // { employee, badgeNumber, bioName, score }
  const noMatch     = []; // { badgeNumber, bioName }
  const alreadySet  = []; // { employee, badgeNumber }

  for (const [badge, bioName] of badges) {
    // Check if any employee already has this badge assigned
    const existingOwner = employees.find(e => e.badgeNumber === badge);
    if (existingOwner) {
      alreadySet.push({ employee: existingOwner, badgeNumber: badge });
      console.log(
        `  ${badge.padEnd(10)}  ${bioName.padEnd(33)}  ${existingOwner.name.padEnd(28)}  —        ✅ Already set`
      );
      continue;
    }

    // Try to match by name
    const match = findBestMatch(bioName, employees, 0.8); // Only accept ≥ 80% match

    if (match) {
      toUpdate.push({
        employee:    match.employee,
        badgeNumber: badge,
        bioName,
        score:       match.score
      });
      const scoreStr = (match.score * 100).toFixed(0) + "%";
      console.log(
        `  ${badge.padEnd(10)}  ${bioName.padEnd(33)}  ${match.employee.name.padEnd(28)}  ${scoreStr.padEnd(7)}  🔄 Will update`
      );
    } else {
      noMatch.push({ badgeNumber: badge, bioName });
      console.log(
        `  ${badge.padEnd(10)}  ${bioName.padEnd(33)}  ${"(no match)".padEnd(28)}  —        ❌ No match`
      );
    }
  }

  console.log("─".repeat(90));
  console.log(`\n📊  Summary:`);
  console.log(`    Already set:   ${alreadySet.length}`);
  console.log(`    Will update:   ${toUpdate.length}`);
  console.log(`    No match:      ${noMatch.length}`);

  if (noMatch.length > 0) {
    console.log(`\n⚠️   Unmatched badges (employee name not found in DB):`);
    for (const { badgeNumber, bioName } of noMatch) {
      console.log(`    - ${badgeNumber.padEnd(10)} "${bioName}"`);
    }
  }

  // Apply updates if --apply flag is set
  if (MODE === "apply") {
    console.log(`\n💾  Applying ${toUpdate.length} badge number updates...`);
    let updated = 0;
    let failed  = 0;

    for (const { employee, badgeNumber, bioName } of toUpdate) {
      try {
        await Employee.findByIdAndUpdate(employee._id, { badgeNumber });
        console.log(`    ✅  ${employee.code} "${employee.name}" → badgeNumber: "${badgeNumber}"`);
        updated++;
      } catch (err) {
        console.error(`    ❌  Failed to update ${employee.code}: ${err.message}`);
        failed++;
      }
    }

    console.log(`\n✅  Done. Updated: ${updated}  Failed: ${failed}`);
  } else {
    console.log(`\n💡  Run with --apply to save changes to the database:`);
    console.log(`    node scripts/sync-badge-numbers.mjs --apply\n`);
  }

  await mongoose.disconnect();
}

// ─── Test Cases ─────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("🧪  Running test cases...\n");

  let passed = 0;
  let failed = 0;

  const assert = (label, condition) => {
    if (condition) {
      console.log(`  ✅  PASS: ${label}`);
      passed++;
    } else {
      console.log(`  ❌  FAIL: ${label}`);
      failed++;
    }
  };

  // ── Test 1: normaliseName ──
  console.log("── normaliseName ──");
  assert(
    'normaliseName("Fayis Kovvalil Veedu") === "FAYIS KOVVALIL VEEDU"',
    normaliseName("Fayis Kovvalil Veedu") === "FAYIS KOVVALIL VEEDU"
  );
  assert(
    'normaliseName("  john   DOE  ") === "JOHN DOE"',
    normaliseName("  john   DOE  ") === "JOHN DOE"
  );
  assert(
    'normaliseName("") === ""',
    normaliseName("") === ""
  );

  // ── Test 2: nameSimilarity ──
  console.log("\n── nameSimilarity ──");
  assert(
    "Perfect match returns 1",
    nameSimilarity("JOHN DOE", "JOHN DOE") === 1
  );
  assert(
    "Completely different names return 0",
    nameSimilarity("JOHN DOE", "ALICE SMITH") === 0
  );
  assert(
    "Partial match (first name only) > 0",
    nameSimilarity("JOHN DOE", "JOHN SMITH") > 0
  );
  assert(
    '"FAYIS KOVVALIL VEEDU" vs "FAYIS KOVVALIL" score > 0.5',
    nameSimilarity("FAYIS KOVVALIL VEEDU", "FAYIS KOVVALIL") > 0.5
  );

  // ── Test 3: findBestMatch ──
  console.log("\n── findBestMatch ──");
  const mockEmployees = [
    { _id: "1", name: "FAYIS KOVVALIL VEEDU",       code: "EMP001" },
    { _id: "2", name: "MUHAMMED FAIZ THENAKKATTIL",  code: "EMP002" },
    { _id: "3", name: "SHAFEEK MAMPULLI NHALIL",     code: "EMP003" },
    { _id: "4", name: "NIMISHA SHAMSU",               code: "EMP004" },
    { _id: "5", name: "RASAL",                        code: "EMP005" },
  ];

  const m1 = findBestMatch("FAYIS KOVVALIL VEEDU", mockEmployees);
  assert(
    'findBestMatch exact: matches "FAYIS KOVVALIL VEEDU"',
    m1 && m1.employee.code === "EMP001" && m1.score === 1
  );

  const m2 = findBestMatch("NIMISHA SHAMSU", mockEmployees);
  assert(
    'findBestMatch exact: matches "NIMISHA SHAMSU"',
    m2 && m2.employee.code === "EMP004" && m2.score === 1
  );

  const m3 = findBestMatch("RASAL", mockEmployees);
  assert(
    'findBestMatch single word: matches "RASAL"',
    m3 && m3.employee.code === "EMP005"
  );

  const m4 = findBestMatch("COMPLETELY UNKNOWN PERSON", mockEmployees);
  assert(
    "findBestMatch no match below threshold returns null",
    m4 === null
  );

  const m5 = findBestMatch("MUHAMMED FAIZ", mockEmployees);
  assert(
    'findBestMatch partial: "MUHAMMED FAIZ" → "MUHAMMED FAIZ THENAKKATTIL" score > 0.5',
    m5 && m5.employee.code === "EMP002" && m5.score > 0.5
  );

  // ── Test 4: extractBadgeMap ──
  console.log("\n── extractBadgeMap ──");
  const mockTransactions = [
    { BadgeNumber: "R106", EmployeeName: "FAYIS KOVVALIL VEEDU" },
    { BadgeNumber: "R106", EmployeeName: "FAYIS KOVVALIL VEEDU" },
    { BadgeNumber: "R175", EmployeeName: "NIMISHA SHAMSU" },
    { BadgeNumber: "R175", EmployeeName: "NIMISHA SHAMSU" },
    { BadgeNumber: "R166", EmployeeName: "RASAL" },
    { BadgeNumber: null,   EmployeeName: "GHOST" },           // should be ignored
    { BadgeNumber: "R999", EmployeeName: null },               // should be ignored
  ];

  const bMap = extractBadgeMap(mockTransactions);
  assert(
    'extractBadgeMap: "R106" → "FAYIS KOVVALIL VEEDU"',
    bMap["R106"] === "FAYIS KOVVALIL VEEDU"
  );
  assert(
    'extractBadgeMap: "R175" → "NIMISHA SHAMSU"',
    bMap["R175"] === "NIMISHA SHAMSU"
  );
  assert(
    'extractBadgeMap: "R166" → "RASAL"',
    bMap["R166"] === "RASAL"
  );
  assert(
    "extractBadgeMap: null BadgeNumber ignored",
    !bMap[null] && !bMap["null"]
  );
  assert(
    "extractBadgeMap: null EmployeeName ignored",
    bMap["R999"] === undefined
  );
  assert(
    `extractBadgeMap: total unique badges = 3`,
    Object.keys(bMap).length === 3
  );

  // ── Test 5: Live API test (no DB) ──
  console.log("\n── Live BioCloud API test ──");
  try {
    const now  = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 7);
    const pad  = n => String(n).padStart(2, "0");
    const fmt  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    const txns = await fetchBioCloudTransactions(
      `${fmt(past)} 00:00:00`,
      `${fmt(now)} 23:59:59`
    );

    assert("API returns an array",    Array.isArray(txns));
    assert("API returns > 0 records", txns.length > 0);

    if (txns.length > 0) {
      const first = txns[0];
      assert("First record has BadgeNumber",  typeof first.BadgeNumber === "string");
      assert("First record has EmployeeName", typeof first.EmployeeName === "string");
      assert("First record has VerifyTime",   typeof first.VerifyTime === "string");
      assert("First record has Status",       typeof first.Status === "string");
      assert("First record has Id",           typeof first.Id === "number");

      const badgeMap = extractBadgeMap(txns);
      assert(
        `extractBadgeMap from live data returns at least 1 badge`,
        Object.keys(badgeMap).length > 0
      );

      console.log(`\n    📋 Sample badges from live API:`);
      Object.entries(badgeMap).slice(0, 5).forEach(([badge, name]) => {
        console.log(`       ${badge.padEnd(10)} → "${name}"`);
      });
    }
  } catch (err) {
    console.log(`  ❌  FAIL: Live API test — ${err.message}`);
    failed++;
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`🧪  Tests complete. Passed: ${passed}  Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Entry Point ────────────────────────────────────────────────────────────────

if (MODE === "test") {
  runTests().catch(err => {
    console.error("Test runner error:", err);
    process.exit(1);
  });
} else {
  run().catch(err => {
    console.error("\n❌  Script failed:", err.message);
    mongoose.disconnect();
    process.exit(1);
  });
}
