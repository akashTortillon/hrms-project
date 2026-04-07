// backend/src/scripts/seedMastersFromJson.js
import fs from "fs";

/**
 * Seed Masters by calling your local Master create APIs.
 *
 * Reads:  backend/src/master_seed_values.json
 * Calls:  POST /api/masters/:typeSlug
 *
 * Required env vars:
 *   TOKEN    Admin JWT with MANAGE_MASTERS
 *
 * Optional env vars:
 *   BASE_URL http://localhost:5000
 *
 * Run (PowerShell, repo root):
 *   $env:BASE_URL="http://localhost:5000"
 *   $env:TOKEN="PASTE_ADMIN_JWT"
 *   node backend/src/scripts/seedMastersFromJson.js
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NjdhOGYzNWM5MWJjY2VkMDdhY2I0MiIsImlhdCI6MTc3NTU0NjE0NywiZXhwIjoxNzc1NjMyNTQ3fQ.dAgdCUgfqDNiFhpSQ1yjjb44xqlhAYMh4K98behqzUM";

if (!TOKEN) {
  throw new Error("Missing TOKEN env var (admin JWT with MANAGE_MASTERS).");
}

const SEED_PATH = "backend/src/master_seed_values.json";
const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));

const MASTER_BASE = "/api/masters";

async function post(typeSlug, name) {
  const res = await fetch(`${BASE_URL}${MASTER_BASE}/${typeSlug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ name }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.message || `${res.status} ${res.statusText}`;
    // Your controller returns 400 for duplicates with this message.
    if (String(msg).toLowerCase().includes("already exists")) {
      return { ok: true, skipped: true, msg };
    }
    return { ok: false, skipped: false, msg };
  }

  return { ok: true, skipped: false, msg: "created" };
}

async function seedList(typeSlug, values) {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const v of values) {
    const name = String(v ?? "").trim();
    if (!name) continue;

    const r = await post(typeSlug, name);
    if (!r.ok) {
      failed++;
      // eslint-disable-next-line no-console
      console.error(`FAIL ${typeSlug} "${name}": ${r.msg}`);
      continue;
    }

    if (r.skipped) skipped++;
    else created++;
  }

  // eslint-disable-next-line no-console
  console.log(`${typeSlug}: created=${created}, skipped=${skipped}, failed=${failed}`);
}

async function main() {
  // These are the types your employee importer strictly validates.
  await seedList("departments", seed.departments || []);
  await seedList("branches", seed.branches || []);
  await seedList("designations", seed.designations || []);

  // eslint-disable-next-line no-console
  console.log("Done.");
}

main();

