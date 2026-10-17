#!/usr/bin/env node
// Bot-liveness alert smoke test.
//
//   node scripts/test-liveness-smoke.mjs                # read-only status report
//   node scripts/test-liveness-smoke.mjs --tick-down    # full down→alert→recovery cycle
//   node scripts/test-liveness-smoke.mjs --tick-down --no-recovery
//
// WHY THIS EXISTS
// The state machine is unit-tested (src/lib/bot-liveness.test.ts), but that
// cannot prove the DM half: the bot token, the Discord API and the notify
// wiring in the built Worker. --tick-down runs the REAL cron task path exactly
// like the hourly schedule does, without waiting for the bot to actually die.
// It fires up to two real DMs (down alert + recovery) to your own DM, then
// restores everything it touched so state stays healthy.
//
// Steps of --tick-down:
//   1. patch the built worker so POST /__scheduled runs the real runCronTasks
//      (scripts/patch-test-scheduled.mjs, NITRO_TEST_SCHEDULED=1-only)
//   2. build .output/server/.dev.vars from local secrets — NOTE: wrangler looks
//      for .dev.vars NEXT TO --config, not in the repo root. Repo-root copies
//      leave every secret empty (`[notify][probe] no token`, sent=false).
//   3. wrangler dev --config .output/server/wrangler.json (runs the same
//      config the deploy ships; can read the real heartbeat + liveness state)
//   4. CAS-stage a stale heartbeat row, tick, expect `[liveness] alert-down
//      sent=true` in the wrangler log + a real DM
//   5. restore the fresh heartbeat, tick again, expect `alert-recovered`
//   6. teardown ALWAYS: dev server killed, generated .dev.vars removed,
//      heartbeat row restored field-for-field, liveness `flaps` counter
//      restored so repeated smokes can't page a fake crash-loop.
//
// SAFETY: refuses to run when the stored liveness side is already "down" (a
// real alert is due and the state belongs to it) or when the heartbeat is
// already stale for the same reason. Secrets are read from local files and
// are never printed.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_INDEX = path.join(ROOT, ".output", "server", "index.mjs");
const WRANGLER_CONFIG = path.join(ROOT, ".output", "server", "wrangler.json");
const GENERATED_DEV_VARS = path.join(ROOT, ".output", "server", ".dev.vars");
const LOG_FILE = path.join(ROOT, ".wrangler-smoke.log");
const BASE_URL = "http://127.0.0.1:8787"; // default; replaced by the "Ready on" URL from the log

// Same key constants as src/lib/bot-heartbeat-rules.ts (kept in sync — the
// TS modules can't be imported from the bare Node runner, hence the copy).
const HEARTBEAT_KEY = "zyn-bot-heartbeat-v1";
const LIVENESS_KEY = "zyn-bot-liveness-v1";

// Age shifted into the past when staging: past DOWN_AFTER_MS (30 min) so the
// watch fires, small enough that the down alert reads as a real outage.
const STAGED_AGE_MINUTES = 40;

// Secrets the dev server can use; only ones actually found are written.
const SECRET_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "DISCORD_BOT_TOKEN",
  "DISCORD_ANNOUNCE_WEBHOOK_URL",
];
const DOWN_AFTER_MS = 30 * 60 * 1000; // consistent with bot-liveness-rules.ts

// --------------------------------------------------------------------------
// tiny dotenv reading (process.env wins over the files; values never printed)
// --------------------------------------------------------------------------

function parseEnvFile(p) {
  const out = {};
  let raw;
  try {
    raw = readFileSync(p, "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

const localEnv = {
  ...parseEnvFile(path.join(ROOT, ".env")),
  ...parseEnvFile(path.join(ROOT, ".env.local")),
};
function secret(name) {
  return process.env[name] ?? localEnv[name] ?? "";
}

// --------------------------------------------------------------------------
// Supabase REST aux-row access — same wire protocol as src/lib/store-cas.ts
// (re-implemented here because the TS modules can't be imported by the bare
// Node runner; the store-cas tests pin the exact rules these mirror).
// --------------------------------------------------------------------------

async function sbFetch(cfg, key, extraQuery, init) {
  const res = await fetch(
    `${cfg.url}/rest/v1/supabase_kv?key=eq.${encodeURIComponent(key)}${extraQuery ? `&${extraQuery}` : ""}`,
    {
      ...init,
      signal: AbortSignal.timeout(15_000),
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    },
  );
  return res;
}

/** { doc (version-stripped), version } | null — mirrors store-cas.splitVersion. */
async function readRow(cfg, key) {
  const res = await sbFetch(cfg, key, "select=value&limit=1");
  if (!res.ok) throw new Error(`Supabase read ${key}: HTTP ${res.status}`);
  const rows = (await res.json().catch(() => null)) ?? [];
  const value = rows[0]?.value;
  if (!value || typeof value !== "object") return null;
  const { version, ...doc } = value;
  return { doc, version: typeof version === "number" ? version : null };
}

/** CAS write — mirrors store-cas.buildCasPath/buildCasBody. True when applied. */
async function casWrite(cfg, key, doc, expected) {
  const res = await sbFetch(
    cfg,
    key,
    expected === null ? null : `value->>version=eq.${expected}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ value: { ...doc, version: expected === null ? 1 : expected + 1 } }),
    },
  );
  if (!res.ok) return false;
  const rows = (await res.json().catch(() => null)) ?? [];
  return Array.isArray(rows) && rows.length > 0;
}

// --------------------------------------------------------------------------
// wrangler dev lifecycle (output captured to LOG_FILE for the sent= parser)
// --------------------------------------------------------------------------

let devProcess = null;
let logBuffer = "";
let readyUrl = null;

function appendLog(d) {
  logBuffer += d.toString();
  try {
    writeFileSync(LOG_FILE, logBuffer);
  } catch {
    // log writing must never break the smoke
  }
}

function startDevServer() {
  writeFileSync(LOG_FILE, "");
  logBuffer = "";
  const child = spawn("npx", ["wrangler", "dev", "--config", WRANGLER_CONFIG], {
    cwd: ROOT,
    shell: true, // Windows: resolves npx.cmd
    env: { ...process.env, NITRO_TEST_SCHEDULED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  devProcess = child;
  child.stdout.on("data", appendLog);
  child.stderr.on("data", appendLog);
  return waitUntilReady();
}

async function waitUntilReady(timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (devProcess?.exitCode !== null) throw new Error("wrangler dev exited early — see log");
    // Trust wrangler's own "Ready on <url>" line over any assumed port.
    const m = logBuffer.match(/Ready on (https?:\/\/\S+)/);
    if (m) {
      readyUrl = m[1].replace(/\/+$/, "");
      try {
        await fetch(`${readyUrl}/`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
        return; // serving confirmed
      } catch {
        // banner printed but not answering yet — keep waiting briefly
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("wrangler dev did not become ready — see log");
}

function stopDevServer() {
  if (devProcess) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(devProcess.pid), "/T", "/F"], { shell: false });
      } else {
        devProcess.kill("SIGTERM");
        setTimeout(() => devProcess?.kill("SIGKILL"), 3000).unref();
      }
    } catch {
      // already gone
    }
    devProcess = null;
  }
  // Sweep the port synchronously: under shell:true on Windows the CMD
  // wrapper may exit before taskkill walks its tree, orphaning the
  // wrangler/npm supervisor chain that keeps RESPAWNING workerd. The helper
  // kills the top of that chain, so the respawn dies with it.
  try {
    execFileSync(process.execPath, ["scripts/kill-smoke-orphans.mjs"], {
      cwd: ROOT,
      stdio: "inherit",
      timeout: 30_000,
    });
  } catch {
    // best-effort — the standalone helper below in the header covers reruns
  }
}

// Deprecated inline sweep replaced by scripts/kill-smoke-orphans.mjs.

// --------------------------------------------------------------------------
// log parsing
// --------------------------------------------------------------------------

function logByteOffset() {
  // logBuffer is a JS string; slice() below indexes characters, so the offset
  // must be a string index (Buffer.byteLength would desync on multibyte log
  // content like wrangler's module-size table).
  return logBuffer.length;
}

/** All "[liveness]" lines appended after a byte offset. */
function livenessLinesSince(offset) {
  return (logBuffer.slice(offset).match(/^\s*\[liveness\].*$/gm) ?? []).map((l) => l.trim());
}

// --------------------------------------------------------------------------
// flows
// --------------------------------------------------------------------------

function die(msg, code = 1) {
  console.error(`✖ ${msg}`);
  process.exit(code);
}

async function report(cfg) {
  const hb = await readRow(cfg, HEARTBEAT_KEY).catch(() => null);
  const lv = await readRow(cfg, LIVENESS_KEY).catch(() => null);
  const now = Date.now();
  if (!hb?.doc) {
    console.log("heartbeat row   : (none — the bot has never pinged this deployment)");
  } else {
    const ago = Math.round((now - hb.doc.lastSeenAt) / 60_000);
    console.log(
      `heartbeat row   : last seen ${ago} min ago (status ${hb.doc.status ?? "?"}, reconnects ${hb.doc.reconnects ?? 0}, dmErrors ${hb.doc.dmErrors ?? 0})`,
    );
    console.log(
      ago >= 30
        ? "                  STALE — the next hourly cron will alert"
        : "                  fresh — the cron has nothing to alert on right now",
    );
  }
  if (!lv?.doc) {
    console.log("liveness row    : (none yet — the watch adopts state silently on first evaluation)");
  } else {
    const l = lv.doc;
    console.log(
      `liveness row    : side=${l.side} alerts=${l.alerts} flaps=${l.flaps}${l.degradedSince ? " degraded" : ""}`,
    );
  }
}

async function tickDown(cfg, { recovery = true } = {}) {
  if (!existsSync(BUILD_INDEX) || !existsSync(WRANGLER_CONFIG))
    die("no build found — run `npm run build` first (the smoke drives the BUILT worker)", 2);

  // Preconditions: don't interfere with a real incident or a never-pinged bot.
  const hb = await readRow(cfg, HEARTBEAT_KEY);
  if (!hb?.doc || typeof hb.doc.lastSeenAt !== "number")
    die("no heartbeat row yet — the bot has never pinged. Nothing to smoke against.");
  if (Date.now() - hb.doc.lastSeenAt >= DOWN_AFTER_MS)
    die("heartbeat is ALREADY stale — a real down alert is due on the next cron; nothing to smoke.");
  const lv = await readRow(cfg, LIVENESS_KEY);
  if (lv?.doc?.side === "down")
    die('liveness row says side="down" — a real outage is in progress; the state belongs to it.');
  const origHeartbeat = hb.doc;
  const origFlaps = lv?.doc?.flaps ?? 0;

  if (!secret("DISCORD_BOT_TOKEN"))
    die(
      "DISCORD_BOT_TOKEN not found in .env.local/.env — the DM half cannot be proven without it (Worker-only secrets are not readable locally).",
      2,
    );

  // 1. patch the built worker (idempotent)
  execFileSync(process.execPath, ["scripts/patch-test-scheduled.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
  });

  // 2. write .dev.vars NEXT TO the config (the documented gotcha)
  const devVars = SECRET_NAMES.map((name) => `${name}="${secret(name)}"`)
    .filter((line) => !line.endsWith('=""'))
    .join("\n");
  writeFileSync(GENERATED_DEV_VARS, `${devVars}\n`);

  try {
    await tickDownInner(cfg, { recovery, origHeartbeat, origFlaps, heartbeatVersion: hb.version });
  } finally {
    // Unwind BEFORE killing the server: the restore itself needs wrangler? No
    // — it writes via Supabase directly. But it MUST run even if a tick
    // failed: a leftover stale heartbeat pages the owner for nothing.
    try {
      await restoreState(cfg, { origHeartbeat, origFlaps });
    } catch (rlErr) {
      console.error(`⚠ cleanup write failed: ${rlErr?.message ?? rlErr}`);
    }
    stopDevServer();
    if (existsSync(GENERATED_DEV_VARS)) {
      rmSync(GENERATED_DEV_VARS);
      console.log("cleanup         : removed generated .dev.vars");
    }
  }
}

/**
 * Restores everything the smoke touched — called from a finally, so it is
 * idempotent and safe on failure paths. The first caller already did the
 * restore are just no-ops (version-bumped rows re-read fresh).
 */
async function restoreState(cfg, { origHeartbeat, origFlaps }) {
  const cur = (await readRow(cfg, HEARTBEAT_KEY)) ?? null;
  if (cur && JSON.stringify(cur.doc) !== JSON.stringify(origHeartbeat)) {
    await casWrite(cfg, HEARTBEAT_KEY, origHeartbeat, cur.version);
    console.log("restored        : original heartbeat row (post-run cleanup write)");
  }
  // Restore the flap counter the smoke incremented, so a rerun can't chase
  // the crash-loop page after repeated smokes inside the cooldown window.
  const lv2 = await readRow(cfg, LIVENESS_KEY);
  if (lv2?.doc && lv2.doc.flaps > origFlaps && lv2.doc.side === "fresh") {
    await casWrite(cfg, LIVENESS_KEY, { ...lv2.doc, flaps: origFlaps }, lv2.version);
    console.log(`restored        : flap counter back to ${origFlaps} (post-run cleanup write)`);
  }
}

// Factored only to keep teardown in the `finally` above.
async function tickDownInner(cfg, { recovery, origHeartbeat, origFlaps, heartbeatVersion }) {
  console.log("starting wrangler dev (NITRO_TEST_SCHEDULED=1)…");
  await startDevServer();

  const tick = async (label) => {
    const offset = logByteOffset();
    console.log(`tick (${label})   : POST /__scheduled`);
    const res = await fetch(`${readyUrl ?? BASE_URL}/__scheduled?cron=29+*+*+*+*`, {
      method: "POST",
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`tick returned HTTP ${res.status}`);
    await res.text().catch(() => "");
    await new Promise((r) => setTimeout(r, 1500)); // let async log lines flush
    const lines = livenessLinesSince(offset);
    if (lines.length === 0) throw new Error("no [liveness] log line — the task path did not run");
    for (const line of lines) console.log(`  log: ${line}`);
    const last = lines[lines.length - 1].match(/\[liveness\] (\S+) sent=(true|false)/);
    return { action: last?.[1], sent: last?.[2] === "true", line: lines[lines.length - 1] };
  };

  // 4. stage stale → tick → expect alert-down + sent=true
  const staged = { ...origHeartbeat, lastSeenAt: Date.now() - STAGED_AGE_MINUTES * 60_000 };
  let stagedOk = await casWrite(cfg, HEARTBEAT_KEY, staged, heartbeatVersion);
  for (let i = 0; i < 3 && !stagedOk; i++) {
    // Race with the bot's own 5-min ping — re-read and retry.
    const fresh = await readRow(cfg, HEARTBEAT_KEY);
    stagedOk = await casWrite(cfg, HEARTBEAT_KEY, staged, fresh?.version ?? null);
  }
  if (!stagedOk) throw new Error("could not stage a stale heartbeat row (all CAS retries conflicted)");
  console.log(`staged          : heartbeat rewritten to ${STAGED_AGE_MINUTES} min ago`);

  const down = await tick("down");
  if (down.action !== "alert-down" || !down.sent)
    throw new Error(`expected "[liveness] alert-down sent=true", got: ${down.line}`);

  // 5. restore the ORIGINAL heartbeat (re-read first: the bot may have pinged
  // mid-window, which is fine — its value is fresher than the stage anyway).
  const cur = (await readRow(cfg, HEARTBEAT_KEY)) ?? { version: null };
  await casWrite(cfg, HEARTBEAT_KEY, origHeartbeat, cur.version);
  console.log("restored        : original heartbeat row");

  if (recovery) {
    const rec = await tick("recovery");
    if (rec.action !== "alert-recovered" || !rec.sent)
      throw new Error(`expected "[liveness] alert-recovered sent=true", got: ${rec.line}`);
  }

  // 6. restore the flap counter the smoke just incremented, so a rerun can't
  // chase the crash-loop page after 4 smokes inside the 6h cooldown window.
  const lv2 = await readRow(cfg, LIVENESS_KEY);
  if (lv2?.doc && lv2.doc.flaps > origFlaps) {
    await casWrite(cfg, LIVENESS_KEY, { ...lv2.doc, flaps: origFlaps }, lv2.version);
    console.log(`restored        : flap counter back to ${origFlaps}`);
  }

  console.log(
    "\n✔ smoke passed — the real cron path reached the notify path and a real DM was sent (verify it landed on Discord).",
  );
}

// --------------------------------------------------------------------------

async function main() {
  const cfg = {
    url: secret("SUPABASE_URL").replace(/\/+$/, ""),
    serviceKey: secret("SUPABASE_SERVICE_KEY"),
  };
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url) || !cfg.serviceKey)
    die(
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not found or malformed — set them in .env.local or .env (see .env.example).",
      2,
    );

  const argv = process.argv.slice(2);
  if (argv.includes("--tick-down")) {
    await tickDown(cfg, { recovery: !argv.includes("--no-recovery") });
  } else {
    await report(cfg);
  }
}

main().catch((err) => {
  stopDevServer();
  if (existsSync(GENERATED_DEV_VARS)) rmSync(GENERATED_DEV_VARS);
  console.error(`✖ smoke failed: ${err?.stack ?? err}`);
  console.error(`  full dev log: ${LOG_FILE}`);
  process.exit(1);
});
