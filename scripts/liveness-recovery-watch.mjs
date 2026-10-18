// Post-incident automation: wait for the hosted bot's heartbeat to recover,
// then run a staged mode of the smoke (default: --simulate-degraded) so the
// proof happens the MINUTE the host is healthy instead of whenever someone
// remembers to type it.
//
//   node scripts/liveness-recovery-watch.mjs                       # watch 6h, then run --simulate-degraded
//   node scripts/liveness-recovery-watch.mjs --timeout-hours 2
//   node scripts/liveness-recovery-watch.mjs --then "--tick-down"
//   node scripts/liveness-recovery-watch.mjs --poll-seconds 60
//
// Fires when ALL of these hold (the smoke re-checks everything itself — this
// gate only avoids useless refusal loops):
//   * heartbeat fresh (last ping < 30 min) — the bot is really back
//   * watch side="fresh"      — the hourly cron has processed the recovery
//   * no degradation pending  — the smoke's refusal rules would apply
// A fresh heartbeat that STAYS down (cron can't see the recovery) is logged
// loudly after 90 min; nothing is run while the state belongs to reality.
//
// Read-only while waiting; the command it runs owns its own staging/restore.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { HEARTBEAT_KEY, LIVENESS_STATE_KEY, readAuxRow } from "./lib/supabase-aux.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The watcher owns its own log: on Windows, Node BUFFERS stdout that is
// redirected to a file, so poll lines piped through Start-Process would sit
// in an unflushed buffer for hours and the watch would look dead while
// perfectly alive. appendFileSync per line is synchronous and visible live.
const LOG_PATH = path.join(ROOT, ".liveness-watch.log");

/** Console for interactive runs, plus an immediate append for detached ones. */
function logLine(msg) {
  console.log(msg);
  try {
    appendFileSync(LOG_PATH, `${msg}\n`, "utf8");
  } catch {
    // logging must never break the watch
  }
}

// Mirrors the smoke's refusal boundaries (kept in sync there): a fresh-but-degraded
// bot or a flap counter at the page threshold must NOT hand the smoke a fight
// it will refuse anyway.
const DOWN_AFTER_MS = 30 * 60 * 1000;
const DEGRADED_MIN_RECONNECTS = 3;
const FLAP_PAGE_THRESHOLD = 4;

const argv = process.argv.slice(2);
const flagVal = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const hasFlag = (name) => argv.includes(`--${name}`);

const POLL_MS = Number(flagVal("poll-seconds", 300)) * 1000;
const TIMEOUT_MS = Number(flagVal("timeout-hours", 6)) * 3600_000;
const THEN = (flagVal("then", "--simulate-degraded") ?? "").split(" ").filter(Boolean);

// Same env loader semantics as the other ops scripts: .env.local then .env.
const env = {};
for (const f of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(m[1] in env)) env[m[1]] = v;
    }
  } catch {
    // file absent
  }
}
const cfg = { url: env.SUPABASE_URL.replace(/\/+$/, ""), serviceKey: env.SUPABASE_SERVICE_KEY };
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url) || !cfg.serviceKey) {
  console.error("✖ SUPABASE_URL / SUPABASE_SERVICE_KEY missing or malformed");
  process.exit(2);
}

// Single instance: two concurrent watchers would both see the same recovery
// and fire the staged DMs twice. The lock records our pid; a leftover lock
// from a dead watcher is stolen after checking the pid is really gone.
const LOCK_PATH = path.join(ROOT, ".liveness-watch.lock");
let existingPid = null;
try {
  existingPid = Number(readFileSync(LOCK_PATH, "utf8").trim());
} catch {
  // no lock yet
}
if (existingPid && existingPid > 0) {
  try {
    process.kill(existingPid, 0);
    console.error(`✖ a recovery watcher is already running (pid ${existingPid}) — exiting`);
    process.exit(0);
  } catch {
    // the pid is dead — stale lock, steal it below
  }
}
writeFileSync(LOCK_PATH, String(process.pid), "utf8");

const ts = (ms) => new Date(ms).toISOString().replace("T", " ").slice(11, 19) + "Z";
const startedAt = Date.now();

logLine(
  `[watch] ${ts(Date.now())} recovery watcher started (pid ${process.pid}, then: ${THEN.join(" ") || "(none)"})`,
);

async function state() {
  const hb = await readAuxRow(cfg, HEARTBEAT_KEY).catch(() => null);
  const lv = await readAuxRow(cfg, LIVENESS_STATE_KEY).catch(() => null);
  const hbDoc = hb?.doc ?? null;
  const lastSeenAt = hbDoc && Number.isFinite(hbDoc.lastSeenAt) ? hbDoc.lastSeenAt : null;
  const ageMin = lastSeenAt ? (Date.now() - lastSeenAt) / 60_000 : null;
  return {
    lv: lv?.doc ?? null,
    ageMin,
    reconnects: hbDoc?.reconnects ?? 0,
    dmErrors: hbDoc?.dmErrors ?? 0,
  };
}

while (Date.now() - startedAt < TIMEOUT_MS) {
  const { lv, ageMin, reconnects, dmErrors } = await state();
  const fresh = ageMin !== null && ageMin < DOWN_AFTER_MS / 60_000;

  // One status line per poll — keeps the log diagnosable even when idle.
  logLine(
    `[watch] ${ts(Date.now())} heartbeat ${fresh ? `fresh (${Math.round(ageMin)} min)` : ageMin === null ? "no row" : `stale (${Math.round(ageMin)} min)`}, watch side=${lv?.side ?? "none"}, resets/DMerrs=${reconnects}/${dmErrors}`,
  );

  const ready =
    fresh &&
    lv?.side === "fresh" &&
    lv?.degradedSince === undefined &&
    (lv?.flaps ?? 0) < FLAP_PAGE_THRESHOLD - 1 &&
    reconnects < DEGRADED_MIN_RECONNECTS &&
    (dmErrors ?? 0) === 0;

  if (ready) {
    logLine(
      `[watch] ${ts(Date.now())} heartbeat fresh (${Math.round(ageMin)} min), watch side=fresh — running the smoke`,
    );
    // Capture and relay through the log: detached runs carry no inheritable
    // stdout, and this way the smoke's evidence lives in the same file the
    // watcher's poll lines occupy.
    let exit = 1;
    try {
      const out = execFileSync(process.execPath, ["scripts/test-liveness-smoke.mjs", ...THEN], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 15 * 60_000,
      });
      for (const line of (out ?? "").trimEnd().split("\n").filter(Boolean)) logLine(`  ${line}`);
      exit = 0;
    } catch (err) {
      exit = typeof err.status === "number" ? err.status : 1;
      for (const line of String(err.stdout ?? "")
        .trimEnd()
        .split("\n")
        .filter(Boolean))
        logLine(`  ${line}`);
      for (const line of String(err.stderr ?? "")
        .trimEnd()
        .split("\n")
        .filter(Boolean))
        logLine(`  ✖ ${line}`);
    }
    logLine(`[watch] ${ts(Date.now())} smoke finished with exit ${exit}`);
    process.exit(exit);
  }

  // Loudly name the stall pattern instead of silently looping: if the bot is
  // pinging again (fresh) but the watch still says down after 90+ min, the
  // hourly cron is not doing its job — worth a look, not another blind wait.
  if (fresh === true && lv?.side === "down" && lv?.at && Date.now() - lv.at > 90 * 60_000) {
    logLine(
      `[watch] ${ts(Date.now())} heartbeat is fresh but the watch stayed down since ${ts(lv.at)} — the hourly cron may be stuck; not running anything.`,
    );
    process.exit(3);
  }

  await new Promise((r) => setTimeout(r, POLL_MS));
}

logLine(
  `[watch] ${ts(Date.now())} gave up after ${TIMEOUT_MS / 3600_000}h — heartbeat never recovered (still ${ageMin === null ? "no row" : `${Math.round(ageMin)} min stale`}).`,
);
process.exit(4);
