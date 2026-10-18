#!/usr/bin/env node
// Bot-liveness alert smoke test.
//
//   node scripts/test-liveness-smoke.mjs                # read-only status report
//   node scripts/test-liveness-smoke.mjs --tick-down    # full down→alert→recovery cycle
//   node scripts/test-liveness-smoke.mjs --tick-down --no-recovery
//   node scripts/test-liveness-smoke.mjs --simulate-degraded        # degraded→settle→crash-loop
//   node scripts/test-liveness-smoke.mjs --simulate-degraded --no-crash-loop
//
// WHY THIS EXISTS
// The state machine is unit-tested (src/lib/bot-liveness.test.ts), but that
// cannot prove the DM half: the bot token, the Discord API and the notify
// wiring in the built Worker. --tick-down runs the REAL cron task path exactly
// like the hourly schedule does, without waiting for the bot to actually die.
// It fires up to two real DMs (down alert + recovery) to your own DM, then
// restores everything it touched so state stays healthy.
//
// --simulate-degraded proves the OTHER half the same way, by staging
// TELEMETRY (and liveness state) instead of staleness:
//   1. degrade     : fresh heartbeat + reconnects 4 / dmErrors 2 → expect
//                    "[liveness] alert-degraded sent=true"
//   2. settle      : restore the original clean heartbeat → expect
//                    "[liveness] alert-degraded-recovered sent=true"
//   3. crash-loop  : stage the watch with flaps one short blackout under the
//                    page threshold → expect "[liveness] alert-crash-loop
//                    sent=true" (the ONE page that replaces the drip)
// and restores both rows field-for-field afterwards.
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
// BOTH MODES also clear a leftover SIMULATION STATUS LABEL from the heartbeat
// row (an earlier simulation wrote status "down-sim"; store merges keep it
// until the bot's own gateway reports a status, so the reports kept saying
// "down-sim" on an otherwise healthy row). Only the label is touched —
// lastSeenAt and the liveness state are never rewritten by the report.
//
// SAFETY: refuses to run when the stored liveness side is already "down" (a
// real alert is due and the state belongs to it) or when the heartbeat is
// already stale for the same reason. --simulate-degraded additionally refuses
// when the bot's real telemetry is already degraded, a degraded note is still
// owed, or the flap counter is one blackout from the real crash-loop page.
// Secrets are read from local files and are never printed.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HEARTBEAT_KEY,
  LIVENESS_STATE_KEY as LIVENESS_KEY,
  casWriteAuxRow as casWrite,
  readAuxRow as readRow,
  stripSimulationStatus,
} from "./lib/supabase-aux.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_INDEX = path.join(ROOT, ".output", "server", "index.mjs");
const WRANGLER_CONFIG = path.join(ROOT, ".output", "server", "wrangler.json");
const GENERATED_DEV_VARS = path.join(ROOT, ".output", "server", ".dev.vars");
const LOG_FILE = path.join(ROOT, ".wrangler-smoke.log");
const BASE_URL = "http://127.0.0.1:8787"; // default; replaced by the "Ready on" URL from the log

// Aux-row keys, Supabase REST access and the simulation-status cleanup live in
// scripts/lib/supabase-aux.mjs (shared with bot/doctor.mjs); HEARTBEAT_KEY /
// LIVENESS_STATE_KEY and readRow/casWrite come from there.

// Age shifted into the past when staging: past DOWN_AFTER_MS (30 min) so the
// watch fires, small enough that the down alert reads as a real outage.
const STAGED_AGE_MINUTES = 40;

// Mirrors of src/lib/bot-liveness-rules.ts thresholds (kept in sync for the
// same reason the row keys are): what "degraded" means, and when the flap
// counter tips over into the ONE crash-loop page.
const DEGRADED_MIN_RECONNECTS = 3;
const FLAP_PAGE_THRESHOLD = 4;
const FLAP_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const FLAP_MAX_DARK_MS = 90 * 60 * 1000;

// Telemetry staged by --simulate-degraded phase 1: exercises BOTH degraded
// triggers at once so the DM's detail line reads "4 reconnect(s), 2 DM error(s)".
const STAGED_DEGRADED_TELEMETRY = { reconnects: 4, dmErrors: 2 };

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
      `heartbeat row   : last seen ${ago} min ago (status ${hb.doc.status ?? "none"}, reconnects ${hb.doc.reconnects ?? 0}, dmErrors ${hb.doc.dmErrors ?? 0})`,
    );
    console.log(
      ago >= 30
        ? "                  STALE — the next hourly cron will alert"
        : "                  fresh — the cron has nothing to alert on right now",
    );
    // Refresh a leftover simulation status label (like "down-sim"): it merges
    // into every report until the bot's own gateway reports a real status.
    // Clearing only the label cannot touch the alert state — liveness rules
    // read lastSeenAt/reconnects/dmErrors, never status.
    const cleaned = stripSimulationStatus(hb.doc);
    if (cleaned) {
      const ok = await casWrite(cfg, HEARTBEAT_KEY, cleaned, hb.version);
      console.log(
        ok
          ? `repaired        : cleared leftover simulation status label "${hb.doc.status}" — the bot's next ping rewrites the real one`
          : `⚠ repair missed  : status "${hb.doc.status}" is simulation residue but the cleanup write conflicted — rerun to retry`,
      );
    }
  }
  if (!lv?.doc) {
    console.log(
      "liveness row    : (none yet — the watch adopts state silently on first evaluation)",
    );
  } else {
    const l = lv.doc;
    console.log(
      `liveness row    : side=${l.side} alerts=${l.alerts} flaps=${l.flaps}${l.degradedSince ? " degraded" : ""}`,
    );
  }
}

/**
 * Preconditions shared by both staged modes: never fight a real incident.
 * A side=down row belongs to a real outage; a flap counter near the page
 * threshold would let ONE staged blackout tip the real crash-loop page;
 * a pending degraded note belongs to still-owed degradation.
 */
function assertSmokeBaseline(lv, { allowDegradationPending = false } = {}) {
  if (lv?.doc?.side === "down")
    die('liveness row says side="down" — a real outage is in progress; the state belongs to it.');
  if ((lv?.doc?.flaps ?? 0) >= FLAP_PAGE_THRESHOLD - 1)
    die(
      `flap counter is already at ${lv?.doc?.flaps ?? 0} — a staged blackout would tip the real crash-loop page; wait out the cooldown window first.`,
    );
  if (!allowDegradationPending && lv?.doc?.degradedSince !== undefined)
    die(
      "liveness row is mid-degradation — a degraded alert is in flight; the state belongs to it.",
    );
}

async function tickDown(cfg, { recovery = true } = {}) {
  // Preconditions: don't interfere with a real incident or a never-pinged bot.
  const hb = await readRow(cfg, HEARTBEAT_KEY);
  if (!hb?.doc || typeof hb.doc.lastSeenAt !== "number")
    die("no heartbeat row yet — the bot has never pinged. Nothing to smoke against.");
  if (Date.now() - hb.doc.lastSeenAt >= DOWN_AFTER_MS)
    die(
      "heartbeat is ALREADY stale — a real down alert is due on the next cron; nothing to smoke.",
    );
  const lv = await readRow(cfg, LIVENESS_KEY);
  assertSmokeBaseline(lv);
  const origHeartbeat = hb.doc;
  const origLiveness = lv?.doc ?? null;

  try {
    const tick = await bootTestWorker(cfg);
    await tickDownInner(cfg, { recovery, tick, origHeartbeat, heartbeatVersion: hb.version });
  } finally {
    // Unwind BEFORE killing the server: the restore itself needs wrangler? No
    // — it writes via Supabase directly. But it MUST run even if a tick
    // failed: a leftover stale heartbeat pages the owner for nothing.
    await teardownStagedSmoke(cfg, { origHeartbeat, origLiveness });
  }
}

/**
 * Shared staged-mode plumbing: patch the built worker (idempotent), write the
 * next-to-config .dev.vars and start wrangler dev. Returns the tick helper
 * that POSTs /__scheduled and parses the fresh [liveness] lines. Callers keep
 * their own precondition checks and their finally teardown.
 */
async function bootTestWorker() {
  if (!existsSync(BUILD_INDEX) || !existsSync(WRANGLER_CONFIG))
    die("no build found — run `npm run build` first (the smoke drives the BUILT worker)", 2);
  if (!secret("DISCORD_BOT_TOKEN"))
    die(
      "DISCORD_BOT_TOKEN not found in .env.local/.env — the DM half cannot be proven without it (Worker-only secrets are not readable locally).",
      2,
    );

  execFileSync(process.execPath, ["scripts/patch-test-scheduled.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
  });

  // .dev.vars goes NEXT TO the config (the documented gotcha)
  const devVars = SECRET_NAMES.map((name) => `${name}="${secret(name)}"`)
    .filter((line) => !line.endsWith('=""'))
    .join("\n");
  writeFileSync(GENERATED_DEV_VARS, `${devVars}\n`);

  console.log("starting wrangler dev (NITRO_TEST_SCHEDULED=1)…");
  await startDevServer();

  return async function tick(label) {
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
}

/** Shared unwinding for every staged mode: restore rows, kill server, rm .dev.vars. */
async function teardownStagedSmoke(cfg, orig) {
  try {
    await restoreState(cfg, orig);
  } catch (err) {
    console.error(`⚠ cleanup write failed: ${err?.message ?? err}`);
  }
  stopDevServer();
  if (existsSync(GENERATED_DEV_VARS)) {
    rmSync(GENERATED_DEV_VARS);
    console.log("cleanup         : removed generated .dev.vars");
  }
}

/** CAS-stage a rewritten heartbeat row, retrying against the bot's 5-min-ping races. */
async function stageHeartbeat(cfg, staged, expectedVersion) {
  let ok = await casWrite(cfg, HEARTBEAT_KEY, staged, expectedVersion);
  for (let i = 0; i < 3 && !ok; i++) {
    // Race with the bot's own 5-min ping — re-read and retry.
    const fresh = await readRow(cfg, HEARTBEAT_KEY);
    ok = await casWrite(cfg, HEARTBEAT_KEY, staged, fresh?.version ?? null);
  }
  if (!ok) throw new Error("could not stage a heartbeat row (all CAS retries conflicted)");
}

/**
 * Restores everything a staged mode touched — called from a finally, so it is
 * idempotent and safe on failure paths. Both rows go back FIELD-FOR-FIELD:
 * after a run the watch state is exactly what the owner left behind (flap
 * counter included, so repeated smokes can't chase a fake crash-loop page;
 * mid-alert state included, so a refused --no-recovery can't cause a
 * spurious "it's back" DM from the next real cron). Version-bumped rows
 * re-read fresh, so repeat calls are no-ops.
 */
async function restoreState(cfg, { origHeartbeat, origLiveness }) {
  const cur = (await readRow(cfg, HEARTBEAT_KEY)) ?? null;
  // A field-for-field restore must not resurrect a simulation status label
  // the report mode already cleaned (or one the original row carried).
  const restoredHeartbeat = stripSimulationStatus(origHeartbeat) ?? origHeartbeat;
  if (cur && JSON.stringify(cur.doc) !== JSON.stringify(restoredHeartbeat)) {
    await casWrite(cfg, HEARTBEAT_KEY, restoredHeartbeat, cur.version);
    console.log(
      restoredHeartbeat !== origHeartbeat
        ? "restored        : original heartbeat row (leftover simulation status label dropped)"
        : "restored        : original heartbeat row (post-run cleanup write)",
    );
  }
  if (origLiveness) {
    const lv2 = await readRow(cfg, LIVENESS_KEY);
    if (lv2?.doc && JSON.stringify(lv2.doc) !== JSON.stringify(origLiveness)) {
      await casWrite(cfg, LIVENESS_KEY, origLiveness, lv2.version);
      console.log("restored        : original liveness row (post-run cleanup write)");
    }
  }
}

// Factored so the teardown lives in the caller's `finally`.
async function tickDownInner(cfg, { recovery, tick, origHeartbeat, heartbeatVersion }) {
  // 4. stage stale → tick → expect alert-down + sent=true
  const staged = { ...origHeartbeat, lastSeenAt: Date.now() - STAGED_AGE_MINUTES * 60_000 };
  await stageHeartbeat(cfg, staged, heartbeatVersion);
  console.log(`staged          : heartbeat rewritten to ${STAGED_AGE_MINUTES} min ago`);

  const down = await tick("down");
  if (down.action !== "alert-down" || !down.sent)
    throw new Error(`expected "[liveness] alert-down sent=true", got: ${down.line}`);

  // 5. restore the ORIGINAL heartbeat (re-read first: the bot may have pinged
  // mid-window, which is fine — its value is fresher than the stage anyway).
  // stripSimulationStatus keeps the restore from re-planting a label the
  // report mode (or a teardown before the report existed) already cleaned.
  const cur = (await readRow(cfg, HEARTBEAT_KEY)) ?? { version: null };
  await casWrite(
    cfg,
    HEARTBEAT_KEY,
    stripSimulationStatus(origHeartbeat) ?? origHeartbeat,
    cur.version,
  );
  console.log("restored        : original heartbeat row");

  if (recovery) {
    const rec = await tick("recovery");
    if (rec.action !== "alert-recovered" || !rec.sent)
      throw new Error(`expected "[liveness] alert-recovered sent=true", got: ${rec.line}`);
  }

  console.log(
    "\n✔ smoke passed — the real cron path reached the notify path and a real DM was sent (verify it landed on Discord).",
  );
}

/**
 * --simulate-degraded: the degraded + crash-loop half of the watch, proven
 * the same way --tick-down proves the down half — real CRON task under
 * wrangler dev, real DMs, whole state restored afterwards.
 *
 *   phase degrade    : stage reconnects 4 + dmErrors 2 on a fresh heartbeat
 *                      → expect "[liveness] alert-degraded sent=true"
 *   phase settle     : restore the original clean heartbeat → expect
 *                      "[liveness] alert-degraded-recovered sent=true"
 *   phase crash-loop : stage the watch side=down with flaps ONE short
 *                      blackout under the page threshold and a short dark
 *                      window, with the heartbeat fresh and clean — the
 *                      recovery branch counts up to threshold and fires the
 *                      ONE "alert-crash-loop" page that replaces the drip
 *                      of suppressed recovery DMs
 */
async function simulateDegraded(cfg, { crashLoop = true } = {}) {
  const hb = await readRow(cfg, HEARTBEAT_KEY);
  if (!hb?.doc || typeof hb.doc.lastSeenAt !== "number")
    die("no heartbeat row yet — the bot has never pinged. Nothing to simulate against.");
  if (Date.now() - hb.doc.lastSeenAt >= DOWN_AFTER_MS)
    die(
      "heartbeat is ALREADY stale — a real down alert is due on the next cron; nothing to simulate.",
    );
  if ((hb.doc.reconnects ?? 0) >= DEGRADED_MIN_RECONNECTS || (hb.doc.dmErrors ?? 0) > 0)
    die(
      `the bot's real gateway is already degraded (reconnects ${hb.doc.reconnects ?? 0}, dmErrors ${hb.doc.dmErrors ?? 0}) — a real degraded alert is due; the state belongs to it.`,
    );
  const lv = await readRow(cfg, LIVENESS_KEY);
  assertSmokeBaseline(lv);
  const origHeartbeat = hb.doc;
  const origLiveness = lv?.doc ?? null;

  try {
    const tick = await bootTestWorker(cfg);

    // Phase 1 — degrade: the bot keeps pinging, but the gateway struggles.
    await stageHeartbeat(
      cfg,
      { ...origHeartbeat, lastSeenAt: Date.now() - 60_000, ...STAGED_DEGRADED_TELEMETRY },
      hb.version,
    );
    console.log("staged          : reconnects=4, dmErrors=2 on a fresh heartbeat");
    const degraded = await tick("degraded");
    if (degraded.action !== "alert-degraded" || !degraded.sent)
      throw new Error(`expected "[liveness] alert-degraded sent=true", got: ${degraded.line}`);

    // Phase 2 — settle: healthy telemetry again → the "it calmed down" note.
    const cur = (await readRow(cfg, HEARTBEAT_KEY)) ?? { version: null };
    await casWrite(
      cfg,
      HEARTBEAT_KEY,
      stripSimulationStatus(origHeartbeat) ?? origHeartbeat,
      cur.version,
    );
    console.log("restored        : original heartbeat row (clean telemetry)");
    const settled = await tick("settle");
    if (settled.action !== "alert-degraded-recovered" || !settled.sent)
      throw new Error(
        `expected "[liveness] alert-degraded-recovered sent=true", got: ${settled.line}`,
      );

    // Phase 3 — crash-loop: the recovery branch counts stage 3's short blip as
    // the final flap inside the cooldown window, so it must fire AFTER the
    // settle phase, with the heartbeat fresh and clean. The staged "dark"
    // window sits mid-budget on both rules (cooldown half-used, dark ~45 min
    // of the ≤90 short-blip budget) and flaps sit at threshold-1: ONE more
    // short blackout is exactly how a real crash loop tips the page.
    if (crashLoop) {
      const nowMs = Date.now();
      const stagedLiveness = {
        side: "down",
        at: nowMs - Math.floor(FLAP_COOLDOWN_MS / 2), // watch last evaluated mid-cooldown
        downSince: nowMs - Math.floor(FLAP_MAX_DARK_MS / 2), // outage reads as a SHORT blip
        alerts: 1,
        flaps: FLAP_PAGE_THRESHOLD - 1,
      };
      let lvOk = await casWrite(
        cfg,
        LIVENESS_KEY,
        stagedLiveness,
        (await readRow(cfg, LIVENESS_KEY))?.version ?? null,
      );
      for (let i = 0; i < 3 && !lvOk; i++) {
        const fresh = await readRow(cfg, LIVENESS_KEY);
        lvOk = await casWrite(cfg, LIVENESS_KEY, stagedLiveness, fresh?.version ?? null);
      }
      if (!lvOk) throw new Error("could not stage the liveness row (all CAS retries conflicted)");
      console.log(
        `staged          : liveness side=down, flaps=${FLAP_PAGE_THRESHOLD - 1}, dark ~${Math.round(FLAP_MAX_DARK_MS / 2 / 60_000)} min (one blip from the crash-loop page)`,
      );
      // Heartbeat fresh and clean once more: the settle tick (or a real ping
      // that slipped in) must not leave degraded telemetry on the recovery
      // branch — it pages recovery-with-trouble instead of the crash-loop.
      await stageHeartbeat(
        cfg,
        { ...origHeartbeat, lastSeenAt: Date.now() - 60_000, reconnects: 0, dmErrors: 0 },
        (await readRow(cfg, HEARTBEAT_KEY))?.version ?? null,
      );

      const loop = await tick("crash-loop");
      if (loop.action !== "alert-crash-loop" || !loop.sent)
        throw new Error(`expected "[liveness] alert-crash-loop sent=true", got: ${loop.line}`);
    }

    console.log(
      crashLoop
        ? "\n✔ degraded smoke passed — degraded + settled + crash-loop DMs all went out through the real task path (verify they landed on Discord)."
        : "\n✔ degraded smoke passed — degraded + settled DMs went out through the real task path (verify they landed on Discord).",
    );
  } finally {
    await teardownStagedSmoke(cfg, { origHeartbeat, origLiveness });
  }
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
  } else if (argv.includes("--simulate-degraded")) {
    await simulateDegraded(cfg, { crashLoop: !argv.includes("--no-crash-loop") });
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
