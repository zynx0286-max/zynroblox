// ZYN portfolio — Discord DM bot.
//
// DM it any text containing Roblox game links or Discord server invites and
// they're added to the portfolio automatically (see src/lib/ingest.ts).
// Requires:
//   DISCORD_BOT_TOKEN  — bot token from the Discord developer portal
//   DISCORD_BOT_SECRET — shared HMAC secret (same value as the Worker secret)
//   SITE_URL           — optional, defaults to the production Worker URL
// Run with: npm run bot
//
// The bot sends the RAW message text to the server; all parsing, metadata
// resolution and storage happen server-side behind an HMAC signature.

import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from "discord.js";

// --- Tiny .env loader (.env.local wins over .env; real env wins over both) ---
function loadEnvFile(file) {
  if (!readEnv(file)) return;
  function readEnv(f) {
    let text;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      return false;
    }
    for (const line of text.split(/\r?\n/)) {
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
    return true;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const TOKEN = process.env.DISCORD_BOT_TOKEN ?? "";
const SECRET = process.env.DISCORD_BOT_SECRET ?? "";
const SITE = (process.env.SITE_URL ?? "https://roblox.zynx0286.workers.dev").replace(/\/+$/, "");

if (!TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN in .env.local — see docs/discord-bot.md");
  process.exit(1);
}
if (!SECRET) {
  console.error("Missing DISCORD_BOT_SECRET in .env.local — copy it from the Worker secret setup");
  process.exit(1);
}

// --- Signed ingest call ------------------------------------------------------

function sign(timestamp, body) {
  return createHmac("sha256", SECRET).update(`${timestamp}.${body}`).digest("hex");
}

async function submitToServer(text, category, ownerId) {
  // ownerId lets the Worker DM you for things that happen with nobody around
  // (the nightly refresh, the weekly digest) — otherwise you would have to
  // look up and configure your own Discord user id.
  const body = JSON.stringify({
    text,
    ...(category ? { category } : {}),
    ...(ownerId ? { ownerId } : {}),
  });
  const timestamp = String(Date.now());
  const res = await fetch(`${SITE}/api/discord-ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": sign(timestamp, body),
      "x-timestamp": timestamp,
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// --- Message handling --------------------------------------------------------

const USAGE = [
  "**How to use me**",
  "DM me a link and it gets added to the portfolio:",
  "• Roblox game — `https://www.roblox.com/games/<id>/...` (title, icon and play link are filled in automatically, and it joins the visit counter)",
  "• Discord server — `https://discord.gg/<code>` (server name and member counts are filled in)",
  "",
  "Optional first line sets the category:",
  "`cat: SFX / Audio` then the link(s) on the next line",
].join("\n");

/** Public site URL for an entry, so the reply is clickable. */
function entryUrl(slug) {
  return `${SITE}/work/${slug}`;
}

/** "[`/work/<slug>`](url)" — a clickable link labelled with the site path. */
function entryLink(slug) {
  return `[\`/work/${slug}\`](${entryUrl(slug)})`;
}

/** "description, image" -> a readable phrase. */
function describeMissing(missing) {
  if (!missing || missing.length === 0) return null;
  if (missing.length === 1) return missing[0];
  return `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
}

function resultEmbed(outcome) {
  const embed = new EmbedBuilder().setTimestamp(new Date());
  const kindLabel = outcome.kind === "roblox" ? "Roblox game" : "Discord server";
  // When an entry already existed, its details ride along so the reply can
  // show what is actually on the site rather than a bare "already added".
  const existing = outcome.existing;

  if (outcome.status === "created" && existing) {
    // A placeholder entry that just received real metadata: nothing was added,
    // an existing entry was completed. Say so, or it reads as a new entry.
    embed
      .setColor(0x3b82f6)
      .setTitle(`🔧 Updated existing entry: ${outcome.title}`)
      .setDescription(
        "This game was already on the site with a placeholder title — the real title and icon are now filled in.",
      )
      .addFields(
        { name: "Kind", value: kindLabel, inline: true },
        { name: "Page", value: entryLink(outcome.slug), inline: true },
      );
    return embed;
  }

  if (outcome.status === "created" && outcome.placeholder) {
    // Roblox didn't answer (it rate-limits datacenter IPs), so the link was
    // saved with a placeholder title rather than dropped. Say exactly what to
    // do about it — and that it'll happen automatically overnight — because a
    // bare "Added: Roblox game 123" looks like a finished entry and isn't.
    embed
      .setColor(0xf97316)
      .setTitle(`⚠️ Added as a placeholder: ${outcome.title}`)
      .setDescription(
        "Roblox's API didn't respond (it rate-limits this server), so the real " +
          "title and icon couldn't be fetched. The link is saved so it isn't lost, " +
          "but this entry still needs its details.",
      )
      .addFields(
        { name: "Kind", value: kindLabel, inline: true },
        { name: "Page", value: entryLink(outcome.slug), inline: true },
        {
          name: "What happens next",
          value:
            "The nightly job retries this automatically and fills in the title, " +
            "description and icon once Roblox responds. Until then you can fill " +
            "it in from the admin panel.",
        },
      )
      .setFooter({ text: "Re-DM the same link later and it gets upgraded in place" });
    return embed;
  }

  if (outcome.status === "created") {
    embed
      .setColor(0x22c55e)
      .setTitle(`✅ Added: ${outcome.title}`)
      .addFields(
        { name: "Kind", value: kindLabel, inline: true },
        { name: "Page", value: entryLink(outcome.slug), inline: true },
      )
      .setFooter({ text: "Edit details any time in the admin panel" });
    return embed;
  }

  if (outcome.status === "duplicate") {
    embed
      .setColor(0xeab308)
      .setTitle(`📗 Already on the site: ${outcome.title}`)
      .setDescription(
        `Nothing was added — this link is already in the portfolio. [Open the entry](${entryUrl(outcome.slug)})`,
      );
    const fields = [];
    if (existing?.category)
      fields.push({ name: "Category", value: existing.category, inline: true });
    if (existing?.role) fields.push({ name: "Role", value: existing.role, inline: true });
    if (existing?.featured) fields.push({ name: "Featured", value: "Yes", inline: true });
    if (existing?.tags?.length) fields.push({ name: "Tags", value: existing.tags.join(", ") });
    const missing = describeMissing(existing?.missing);
    if (missing) {
      fields.push({ name: "Still missing", value: missing });
    }
    if (fields.length > 0) embed.addFields(fields);
    embed.setFooter({
      text: missing
        ? "Fill the gaps in the admin panel to finish this entry"
        : "Edit details any time in the admin panel",
    });
    return embed;
  }

  if (outcome.status === "unresolvable") {
    embed.setColor(0xf97316).setTitle("⚠️ Could not add link").setDescription(outcome.detail);
    return embed;
  }

  embed
    .setColor(0xef4444)
    .setTitle("❌ Error")
    .setDescription(outcome.detail ?? "Unknown error");
  return embed;
}

const client = new Client({
  intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag} — DM me links to add portfolio entries.`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.channel.isDMBased()) return; // DMs only, by design

    const text = message.content ?? "";
    // Optional category override: first line "cat: <category>".
    let category;
    let body = text;
    const catMatch = body.match(/^\s*cat:\s*(.+)\s*$/im);
    if (catMatch?.[1] && catMatch.index === 0) {
      category = catMatch[1].trim().slice(0, 60);
      body = body.slice(catMatch[0].length).trim();
    }

    const hasLink = /https?:\/\//i.test(body);
    if (!hasLink) {
      await message.reply(USAGE);
      return;
    }

    await message.channel.sendTyping();
    const { status, data } = await submitToServer(body, category, message.author.id);

    if (status !== 200 || !data?.results) {
      dmErrorCount++;
      await message.reply(`❌ Server error (HTTP ${status}): ${data?.error ?? "try again later"}`);
      return;
    }
    if (data.results.length === 0) {
      await message.reply(USAGE);
      return;
    }
    await message.reply({ embeds: data.results.map(resultEmbed) });
  } catch (error) {
    dmErrorCount++;
    console.error("message handler failed:", error);
    await message
      .reply("❌ Something went wrong handling that — check the bot logs.")
      .catch(() => {});
  }
});

process.on("unhandledRejection", (error) => console.error("unhandled rejection:", error));
process.on("uncaughtException", (error) => {
  console.error("uncaught exception — exiting:", error);
  process.exit(1); // exit so the host's supervisor (or a restart loop) re-runs us
});

// --- Uptime heartbeat + resilience -------------------------------------------
// The gateway silently dies sometimes (network flap, host sleep/redeploy).
// With no explicit reconnect policy the process can sit "running" but dead
// for hours — invisible unless someone DMs and gets nothing. The heartbeat
// makes that obvious in the host's console.
const STARTED_AT = Date.now();
function uptimeLine() {
  const h = Math.floor((Date.now() - STARTED_AT) / 3_600_000);
  console.log(`[heartbeat] up ${h}h, shard status: ${client.ws.status}`);
}
const heartbeat = setInterval(uptimeLine, 3_600_000);
heartbeat.unref?.(); // don't hold the process open just for a log line

// Remote liveness + health telemetry: ping the Worker so `npm run
// bot:doctor` can answer not just "is the bot alive?" but "how healthy is
// its gateway?" — the gateway LOOKS connected while quietly degraded
// (network flap, stalled socket, repeated drops). Same HMAC auth as ingest;
// best-effort in every direction: a failed ping never disturbs DMs, and a
// failed DM still gets a ping.
const PING_INTERVAL_MS = 5 * 60 * 1000;
let reconnectCount = 0; // bumped in the shardDisconnect listener below
let dmErrorCount = 0; // bumped in the message handler's catch + server-error paths

async function pingRemote() {
  try {
    const wsPing =
      typeof client.ws.ping === "number" ? Math.max(0, Math.round(client.ws.ping)) : undefined;
    const body = JSON.stringify({
      status: client.ws.status === 0 ? "ready" : String(client.ws.status),
      ...(wsPing !== undefined ? { pingMs: wsPing } : {}),
      reconnects: reconnectCount,
      dmErrors: dmErrorCount,
    });
    const timestamp = String(Date.now());
    await fetch(`${SITE}/api/bot-heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": sign(timestamp, body),
        "x-timestamp": timestamp,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.warn("[heartbeat] remote ping failed:", error instanceof Error ? error.message : error);
  }
}
const remotePing = setInterval(pingRemote, PING_INTERVAL_MS);
remotePing.unref?.();
// First ping pronto; if the Worker is temporarily unreachable it's retried
// on the next interval — staleness is tolerated, not punished.
pingRemote();

// discord.js auto-reconnects transient gateway drops on its own; the events
// below only cover what it can't. One disconnect listener both counts (for
// the remote health telemetry) and logs the detail.
client.on("error", (error) => console.error("client error:", error));
client.on("shardDisconnect", (event, id) => {
  reconnectCount++;
  console.warn(`shard ${id} disconnected (${event.code}) — waiting for auto-reconnect`);
});
client.on("shardReconnecting", (id) => console.warn(`shard ${id} reconnecting…`));
client.on("shardResume", (id, replays) =>
  console.log(`shard ${id} resumed, replayed ${replays} events`),
);
client.on("shardError", (error, id) => console.error(`shard ${id} error:`, error));

// Login itself is the one thing discord.js won't retry — do it here with
// backoff, so a 60-second Discord hiccup (or Wispbyte's host boot order)
// doesn't leave the process exited when the host's console just says "crashed".
const LOGIN_BACKOFF = [5_000, 15_000, 30_000, 60_000];
async function loginWithRetry() {
  for (let attempt = 1; attempt <= LOGIN_BACKOFF.length + 1; attempt++) {
    try {
      await client.login(TOKEN);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Token problems are permanent — retrying just burns through the
      // crash-loop guard with the same failure.
      const permanent = /disallowed intents|invalid token|an invalid token/i.test(message);
      console.error(`login attempt ${attempt} failed: ${message}`);
      if (permanent || attempt > LOGIN_BACKOFF.length) {
        console.error("giving up — see docs/discord-bot.md troubleshooting");
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, LOGIN_BACKOFF[attempt - 1]));
    }
  }
}
loginWithRetry();

// Graceful shutdown so Wispbyte's stop button cuts the gateway cleanly
// instead of killing mid-handshake (which the crash-loop guard can read as
// a rapid crash).
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`${signal} — logging out`);
    client.destroy().finally(() => process.exit(0));
  });
}
