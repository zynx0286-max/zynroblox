#!/usr/bin/env node
// Smoke test for POST /api/discord-ingest — signs requests the same way the
// bot does and exercises every path. Safe to re-run at any time.
//
//   node scripts/test-ingest.mjs
//
// Mutating cases create real entries and then best-effort-clean them via the
// Supabase service key (SUPABASE_URL + SUPABASE_SERVICE_KEY in .env.local).

import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

function loadEnvFile(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const SITE = (process.env.SITE_URL ?? "https://roblox.zynx0286.workers.dev").replace(/\/+$/, "");
const SECRET = process.env.DISCORD_BOT_SECRET ?? "";
if (!SECRET) {
  console.error("Missing DISCORD_BOT_SECRET in .env.local");
  process.exit(1);
}

async function callRaw(rawBody, { sign = true, staleTimestamp = false } = {}) {
  const timestamp = String(Date.now() - (staleTimestamp ? 10 * 60 * 1000 : 0));
  const headers = { "Content-Type": "application/json" };
  if (sign) {
    headers["x-signature"] = createHmac("sha256", SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    headers["x-timestamp"] = timestamp;
  }
  const res = await fetch(`${SITE}/api/discord-ingest`, {
    method: "POST",
    headers,
    body: rawBody,
    signal: AbortSignal.timeout(30_000),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function call(text, opts = {}) {
  return callRaw(JSON.stringify({ text }), opts);
}

// Roblox's "Advanced Battle Ropes"-style stable public place (a well-known
// default template) — deterministic metadata without depending on a specific
// game staying online. Any public game works; a random template is fine.
const ROBLOX_TEST_URL =
  process.env.INGEST_TEST_ROBLOX_URL ?? "https://www.roblox.com/games/1818/--";
const DISCORD_TEST_INVITE = process.env.INGEST_TEST_DISCORD_INVITE ?? "discord.gg/zyn";

let pass = 0;
let fail = 0;
function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log(`Smoke-testing ${SITE}/api/discord-ingest\n`);

// --- 1. Unsigned request must be rejected ------------------------------------
console.log("1. Unsigned request");
{
  const { status } = await call("https://www.roblox.com/games/999999999/x", { sign: false });
  check("401 without signature", status === 401, `got ${status}`);
}

// --- 2. Stale timestamp must be rejected --------------------------------------
console.log("2. Replay guard");
{
  const { status } = await call("https://www.roblox.com/games/999999999/x", {
    staleTimestamp: true,
  });
  check("401 with 10-minute-old timestamp", status === 401, `got ${status}`);
}

// --- 3. Malformed body must be 4xx ---------------------------------------------
// Auth comes first by design (never parse untrusted bodies): an UNSIGNED
// malformed body gets 401, a SIGNED one gets 400.
console.log("3. Malformed body");
{
  const unsigned = await callRaw("not json at all", { sign: false });
  check("401 on unsigned non-JSON body", unsigned.status === 401, `got ${unsigned.status}`);

  const { status } = await callRaw("not json at all");
  check("400 on signed non-JSON body", status === 400, `got ${status}`);
}

// --- 4. Empty text is 422 -------------------------------------------------------
console.log("4. Empty text");
{
  const { status } = await call("   ");
  check("422 on whitespace-only text", status === 422, `got ${status}`);
}

// --- 5. Non-link text returns zero results --------------------------------------
console.log("5. Non-link text");
{
  const { status, data } = await call("just checking in, no links here");
  check("200 with zero results", status === 200 && data?.results?.length === 0, `got ${status}`);
}

// --- 6. Garbage/unresolvable links are reported, not crashed ---------------------
console.log("6. Unresolvable Discord invite");
{
  const { status, data } = await call("https://discord.gg/not-a-real-invite-xyz");
  const outcome = data?.results?.[0];
  check(
    "200 with unresolvable status",
    status === 200 && outcome?.status === "unresolvable",
    JSON.stringify(outcome),
  );
}

// --- 7. Generic links are not auto-added ------------------------------------------
console.log("7. Generic link");
{
  const { status, data } = await call("https://example.com/some-page");
  const outcome = data?.results?.[0];
  check(
    "200 with other/unresolvable status",
    status === 200 && outcome?.kind === "other" && outcome?.status === "unresolvable",
    JSON.stringify(outcome),
  );
}

// --- 8. Roblox game creates an entry (MUTATING — cleaned below) --------------------
let createdSlug = null;
console.log("8. Roblox game link (mutating)");
{
  const { status, data } = await call(`${ROBLOX_TEST_URL} smoke-test-${Date.now()}`);
  const outcome = data?.results?.[0];
  createdSlug = outcome?.slug ?? null;
  check(
    "200 with created (or duplicate on re-run)",
    status === 200 && (outcome?.status === "created" || outcome?.status === "duplicate"),
    JSON.stringify(outcome),
  );
  if (outcome?.status === "created") {
    check(
      "entry has a title",
      typeof outcome.title === "string" && outcome.title.length > 0,
      outcome.title,
    );
  }
}

// --- 9. Duplicate detection ----------------------------------------------------------
console.log("9. Duplicate detection");
{
  const { status, data } = await call(ROBLOX_TEST_URL);
  const outcome = data?.results?.[0];
  check(
    "duplicate status when link already added",
    status === 200 && outcome?.status === "duplicate",
    JSON.stringify(outcome),
  );
  // The bot now replies with the matching entry's details instead of a bare
  // "already added", so the payload has to carry them.
  check(
    "duplicate reports the existing entry",
    outcome?.existing?.slug === outcome?.slug && outcome?.existing?.title === outcome?.title,
    JSON.stringify(outcome?.existing),
  );
  check(
    "existing entry carries its category",
    typeof outcome?.existing?.category === "string" && outcome.existing.category.length > 0,
    JSON.stringify(outcome?.existing?.category),
  );
  check(
    "missing fields are listed when the entry is incomplete",
    outcome?.existing?.missing === undefined ||
      (Array.isArray(outcome.existing.missing) &&
        outcome.existing.missing.every((f) => f === "description" || f === "image")),
    JSON.stringify(outcome?.existing?.missing),
  );
}

console.log(`\n${pass} passed, ${fail} failed`);

// --- Cleanup: remove entries created by this test run --------------------------------
if (createdSlug) {
  console.log(`\nCleaning up test entry /work/${createdSlug}…`);
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.log(
      "  ⚠️ No Supabase credentials in .env.local — remove it manually in the admin panel",
    );
  } else {
    // Read-modify-write through PostgREST with the service key.
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
    const res = await fetch(`${url}/rest/v1/supabase_kv?key=eq.zyn-store-v1&select=value`, {
      headers,
    });
    const rows = await res.json().catch(() => []);
    const value = rows?.[0]?.value;
    if (!value) {
      console.log("  ⚠️ Could not read store row for cleanup");
    } else {
      const before = value.works?.length ?? 0;
      value.works = (value.works ?? []).filter((w) => w.slug !== createdSlug);
      const removed = before - value.works.length;
      if (removed > 0) {
        const put = await fetch(`${url}/rest/v1/supabase_kv?key=eq.zyn-store-v1`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ key: "zyn-store-v1", value }),
        });
        console.log(
          put.ok
            ? `  ✓ Removed ${removed} test entry`
            : `  ⚠️ Cleanup write failed (${put.status})`,
        );
      } else {
        console.log("  ✓ Nothing to remove");
      }
    }
  }
}

process.exit(fail > 0 ? 1 : 0);
