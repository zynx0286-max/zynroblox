// Preflight checks for the Discord DM bot. Read-only: nothing is stored,
// nothing is sent to Discord beyond two authenticated "who am I" reads.
//
//   node bot/doctor.mjs
//
// Checks, in order — the first failure is the one to fix, later ones are
// skipped because they depend on it:
//   1. Secrets present          DISCORD_BOT_TOKEN + DISCORD_BOT_SECRET in the
//                               env / .env.local / .env (same loader as the bot)
//   2. Token actually works     GET /users/@me — catches a reset token, a
//                               truncated paste, or missing intents early
//   3. Message Content Intent   POST /applications/@me — the bot cannot see
//                               DM text without it; this is the #1 gotcha
//   4. Worker reachable + secret matches — a signed probe POST of text with
//                               no links. The Worker replies 200 with zero
//                               results and stores nothing; a 401/503 means
//                               DISCORD_BOT_SECRET disagrees between the two
//                               sides, so you learn it NOW, not via "bot
//                               replies ❌ 401" weeks later.
//
// Exit 0 = all clear (the bot will run and ingest will accept it). Any other
// exit code: the printed ✗ line says exactly what to fix.

import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

// bot/doctor.mjs → project root. fileURLToPath, not URL.pathname: on Windows
// a file: URL pathname is "/C:/Users/…" — readFileSync turns it into
// "C:\C:\Users\…" and silently finds nothing (the loadEnvFile catch swallows
// the ENOENT, so every secret probe then reports "missing" on Windows).
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const TOKEN = process.env.DISCORD_BOT_TOKEN ?? "";
const SECRET = process.env.DISCORD_BOT_SECRET ?? "";
const SITE = (process.env.SITE_URL ?? "https://roblox.zynx0286.workers.dev").replace(/\/+$/, "");

let failures = 0;
const ok = (label, detail = "") => console.log(`✓ ${label}${detail ? ` — ${detail}` : ""}`);
const fail = (label, detail = "") => {
  failures++;
  console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
};

async function main() {
  console.log(`Probing site: ${SITE}\n`);

  // 1. Secrets present --------------------------------------------------------
  if (!TOKEN) {
    fail(
      "DISCORD_BOT_TOKEN is set",
      "missing — set it in .env.local (see docs/discord-bot.md step 2)",
    );
  } else {
    ok("DISCORD_BOT_TOKEN is set", `${TOKEN.length} chars`);
  }
  if (!SECRET) {
    fail(
      "DISCORD_BOT_SECRET is set",
      "missing — it must hold the SAME value as the Worker secret of that name",
    );
  } else {
    ok("DISCORD_BOT_SECRET is set", `${SECRET.length} chars`);
  }
  if (!TOKEN || !SECRET) {
    // exitCode, not exit(): an immediate exit can race a closing fetch socket
    // and trip a libuv assertion on Windows; returning lets the loop drain.
    process.exitCode = 1;
    return;
  }

  // 2. Token works ------------------------------------------------------------
  let botTag = null;
  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${TOKEN}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const me = await res.json();
      botTag = me.username
        ? `${me.username}#${me.discriminator === "0" ? "" : me.discriminator}`
        : "?";
      ok("Discord token works", `logged in as ${botTag}`);
    } else if (res.status === 401) {
      fail(
        "Discord token works",
        "401 — the token is wrong or was reset; copy a fresh one from the developer portal",
      );
    } else {
      fail("Discord token works", `HTTP ${res.status}`);
    }
  } catch (error) {
    fail("Discord token works", `network error: ${error.message}`);
  }
  if (!botTag) {
    process.exitCode = 1;
    return;
  }

  // 3. Message Content Intent -------------------------------------------------
  try {
    const res = await fetch("https://discord.com/api/v10/applications/@me", {
      headers: { Authorization: `Bot ${TOKEN}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      fail("Message Content Intent", `could not read application (HTTP ${res.status})`);
    } else {
      const app = await res.json();
      const flags = Number(app.flags ?? 0);
      // Application flags bit 1 << 15 = MESSAGE_CONTENT intent granted.
      const granted = (flags & (1 << 15)) !== 0;
      if (granted) {
        ok("Message Content Intent granted");
      } else {
        fail(
          "Message Content Intent granted",
          "turn it on: developer portal → Bot → Privileged Gateway Intents → Message Content Intent → Save",
        );
      }
    }
  } catch (error) {
    fail("Message Content Intent", `network error: ${error.message}`);
  }

  // 4. Signed probe to the Worker ---------------------------------------------
  // Text with no links: ingest replies with zero results and writes nothing —
  // the safest request that still proves the HMAC secret matches end to end.
  const body = JSON.stringify({ text: "doctor probe — no links, stores nothing" });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", SECRET).update(`${timestamp}.${body}`).digest("hex");
  try {
    const res = await fetch(`${SITE}/api/discord-ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-timestamp": timestamp,
      },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 200 && Array.isArray(data?.results) && data.results.length === 0) {
      ok("Worker ingest accepts our signature", `${SITE}/api/discord-ingest end-to-end OK`);
    } else if (res.status === 401) {
      fail(
        "Worker ingest accepts our signature",
        "401 — DISCORD_BOT_SECRET differs between this machine and the Worker secret. Re-upload one side to match.",
      );
    } else if (res.status === 503) {
      fail(
        "Worker ingest accepts our signature",
        "503 — the Worker has no DISCORD_BOT_SECRET set: npx wrangler secret put DISCORD_BOT_SECRET",
      );
    } else {
      fail(
        "Worker ingest accepts our signature",
        `unexpected HTTP ${res.status}: ${JSON.stringify(data)?.slice(0, 160)}`,
      );
    }
  } catch (error) {
    fail("Worker ingest accepts our signature", `${SITE} unreachable: ${error.message}`);
  }

  // 5. Remote liveness (hosted bot) -------------------------------------------
  // The hosting panel only proves the process started; this asks the Worker,
  // which the RUNNING bot pings every 5 minutes. A stale heartbeat names the
  // problem outright: the bot is probably sitting dead between "crash-free"
  // and "answering DMs".
  try {
    const res = await fetch(`${SITE}/api/bot-heartbeat`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const text = (await res.text()).trim();
      const stale = /STALE/i.test(text);
      const degraded = /DEGRADED/i.test(text);
      const clean = text.replace(/^bot last heartbeat( — DEGRADED)?: /, "");
      if (stale) {
        fail("Bot last seen (remote)", clean);
      } else if (degraded) {
        // Pinging but struggling (reconnects / DM failures): still up, so
        // this is a warning, not a check failure.
        console.log(
          `- Bot last seen (remote) — ${clean} (gateway degraded — see reconnects/DM errors)`,
        );
      } else {
        ok("Bot last seen (remote)", clean);
      }
    } else if (res.status === 503) {
      console.log(
        `- Bot last seen (remote) — ${SITE} has diagnostics disabled (heartbeats need DISCORD_BOT_SECRET on the Worker)`,
      );
    } else {
      fail(
        "Bot last seen (remote)",
        `unexpected HTTP ${res.status} from ${SITE}/api/bot-heartbeat`,
      );
    }
  } catch (error) {
    fail("Bot last seen (remote)", `${SITE} unreachable: ${error.message}`);
  }

  console.log("");
  if (failures === 0) {
    console.log(
      "All checks passed — run `npm run bot` locally or deploy dist/wispbyte-bot/ to the host.",
    );
  } else {
    console.error(`${failures} check(s) failed — fix the ✗ lines above, then re-run.`);
  }
  // No process.exit here: explicit exit while a fetch socket is still closing
  // trips a libuv assertion on Windows (src\win\async.c) and scrambles the
  // exit code. main() returning without pending work exits normally, and the
  // shell reads the real code.
  if (failures > 0) process.exitCode = 1;
}

await main();
