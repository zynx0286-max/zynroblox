#!/usr/bin/env node
// One-time migration: Cloudflare KV -> Supabase Postgres.
//
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_KEY=<service_role key> \
//   node scripts/migrate-kv-to-supabase.mjs data/kv-backup-2026-09-26.json
//
// The backup file is the KV export produced with:
//   npx wrangler kv key get --binding=STORE zyn-store-v1 --remote > data/kv-backup.json
// When no file is passed, the script downloads the value straight from KV
// (requires wrangler to be logged in).

import { readFileSync, existsSync, writeFileSync } from "node:fs";

// Tiny .env loader (no dotenv dependency): .env.local wins over .env,
// neither overrides variables already present in the environment.
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
// .env.local overrides .env; real environment variables override both
// (they are already present in process.env when the script starts).
loadEnvFile(".env.local");
loadEnvFile(".env");

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_KEY. Set them in .env.local (service_role key — the long sb_secret_… secret or the eyJ… JWT labeled service_role, NOT the publishable/anon key).",
  );
  process.exit(1);
}

const ref = SUPABASE_URL.replace(/^https:\/\//, "").split(".")[0];
console.log(`Supabase project: ${ref}`);

async function supabase(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function tableExists() {
  const res = await supabase(`/rest/v1/supabase_kv?key=eq.zyn-store-v1&select=key&limit=1`);
  if (res.status === 404 || res.status === 400) {
    return false;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // PostgREST returns 404 with a PGRST205 hint when the table is missing.
    if (res.status === 404 || text.includes("PGRST205") || text.includes("does not exist")) {
      return false;
    }
    throw new Error(`Supabase check failed (${res.status}): ${text.slice(0, 300)}`);
  }
  await res.body?.cancel().catch(() => {});
  return true;
}

async function ensureTable() {
  if (await tableExists()) {
    console.log("✓ supabase_kv table exists");
    return;
  }
  console.error(
    [
      "",
      "The `supabase_kv` table does not exist yet. Run this SQL once in the",
      "Supabase dashboard → SQL Editor, then re-run this script:",
      "",
      "  create table if not exists public.supabase_kv (",
      "    key text primary key,",
      "    value jsonb not null,",
      "    updated_at timestamptz not null default now()",
      "  );",
      "",
      "  alter table public.supabase_kv enable row level security;",
      "",
      "  -- No policies: the app only uses the service_role key (bypasses RLS);",
      "  -- anon/authenticated roles can neither read nor write this table.",
      "",
      "Then set the two secrets on the Worker and redeploy:",
      "  npx wrangler secret put SUPABASE_URL",
      "  npx wrangler secret put SUPABASE_SERVICE_KEY",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// --- Load the KV data -------------------------------------------------------

async function fetchKvFromWrangler() {
  const { execFileSync } = await import("node:child_process");
  const out = execFileSync(
    "npx",
    ["wrangler", "kv", "key", "get", "--binding=STORE", "zyn-store-v1", "--remote"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32" },
  );
  return out.trim();
}

const backupPath = process.argv[2] ?? "data/kv-backup-2026-09-26.json";
let store;
if (existsSync(backupPath)) {
  console.log(`Reading KV backup: ${backupPath}`);
  store = JSON.parse(readFileSync(backupPath, "utf8"));
} else {
  console.log(`No backup file at ${backupPath} — pulling live from Cloudflare KV…`);
  store = JSON.parse(await fetchKvFromWrangler());
}

const counts = {
  works: store.works?.length ?? 0,
  settings: Object.keys(store.settings ?? {}).length,
  reviews: store.reviews?.length ?? 0,
  testimonials: store.testimonials?.length ?? 0,
  media: store.media?.length ?? 0,
  universeIds: Object.keys(store.universeIds ?? {}).length,
};
console.log("KV contents:", JSON.stringify(counts));

// --- Upload to Supabase ------------------------------------------------------

console.log("Uploading store row to supabase_kv…");
const put = await supabase(`/rest/v1/supabase_kv`, {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify({ key: "zyn-store-v1", value: store }),
});
if (!put.ok) {
  const text = await put.text().catch(() => "");
  console.error(`Upload FAILED (${put.status}): ${text.slice(0, 500)}`);
  process.exit(1);
}
console.log("✓ Store row written to Supabase");

// Also migrate upload blobs if any exist in KV. (Wrangler has no bulk
// key-list for this binding in scripts, so this covers keys written since
// the blob layout change; the app reads KV blobs as fallback anyway.)
console.log(
  "Upload blobs: not migrated individually — the app reads KV blobs as fallback automatically.",
);

// --- Verify round-trip --------------------------------------------------------

const verify = await supabase(`/rest/v1/supabase_kv?key=eq.zyn-store-v1&select=value&limit=1`);
if (!verify.ok) {
  console.error(`Verification read failed (${verify.status})`);
  process.exit(1);
}
const rows = await verify.json();
const value = rows?.[0]?.value;
if (!value || value.works?.length !== store.works?.length) {
  console.error("✗ Verification mismatch — check the Supabase table editor for supabase_kv.");
  process.exit(1);
}
console.log(
  `✓ Verified round-trip: ${value.works.length} works, ${Object.keys(value.settings ?? {}).length} settings sections in Supabase`,
);

// Keep a timestamped copy of what was migrated.
const stamp = `data/kv-backup-${new Date().toISOString().slice(0, 10)}.json`;
if (backupPath !== stamp && !existsSync(stamp)) {
  writeFileSync(stamp, JSON.stringify(store, null, 2));
}
console.log(`Done. Local backup kept at ${stamp}`);
