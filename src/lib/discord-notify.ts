// Sends proactive notifications to the owner from the Worker.
//
// WHY THIS EXISTS SEPARATELY FROM bot/index.mjs
// The bot is a local process reacting to a DM, so it can answer whoever wrote
// to it. It cannot do the other half: things that happen with nobody watching —
// the nightly Roblox refresh, the weekly digest, an entry appearing from the
// CLI. For those the Worker talks to Discord's REST API directly.
//
// TRANSPORTS (either or both, each optional):
//   DISCORD_BOT_TOKEN            → DM the owner. Needs their numeric Discord id,
//                                  which the bot registers on its own from your
//                                  DMs — see lib/notify-config.ts.
//   DISCORD_ANNOUNCE_WEBHOOK_URL → post to a channel, for "new entry" cards.
//
// EVERYTHING IS OPTIONAL. With no secrets set every function here is a no-op
// that returns { sent: false }, so a missing token can never break ingest, a
// save or the nightly job.
//
// The embed builders live in ./notify-embeds.ts, which is pure and cheap to
// import; re-exported here so callers have one obvious place to look.

import { readSecret } from "./read-secret.ts";
import { buildDigest } from "./digest.ts";
import { getNotifyConfig, notificationsActive } from "./notify-config.ts";
import { buildDigestEmbed, type Embed } from "./notify-embeds.ts";
import type { ActivityEntry } from "./store.ts";

export { buildDigestEmbed, buildEntryAnnouncement } from "./notify-embeds.ts";
export type { Embed } from "./notify-embeds.ts";

const DISCORD_API = "https://discord.com/api/v10";
const TIMEOUT_MS = 10_000;

export type NotifyResult = { sent: boolean; reason?: string };

const ok: NotifyResult = { sent: false, reason: "not configured" };

async function discordFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  // 429 carries a retry_after; honour it rather than hammering Discord.
  if (res.status === 429) {
    const body = (await res.json().catch(() => null)) as { retry_after?: number } | null;
    await new Promise((r) => setTimeout(r, Math.min(5000, (body?.retry_after ?? 1) * 1000)));
    return null;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? ({} as Response) : res;
}

/**
 * Finds the DM channel to notify.
 *
 * Prefers the owner id the bot registered (see lib/notify-config.ts) and opens
 * the DM with POST /users/@me/channels, which is the only reliable way —
 * GET /users/@me/channels stops returning a conversation once it goes
 * quiet, so id discovery from it would silently break weeks later. Falls back
 * to that listing for a bot that has never registered.
 */
async function findOwnerDmChannel(token: string): Promise<string | null> {
  const { ownerDiscordId } = await getNotifyConfig();
  if (ownerDiscordId) {
    try {
      const opened = await discordFetch(token, "/users/@me/channels", {
        method: "POST",
        body: JSON.stringify({ recipient_id: ownerDiscordId }),
      });
      const channel = opened
        ? ((await opened.json().catch(() => null)) as { id?: string } | null)
        : null;
      if (channel?.id) return channel.id;
    } catch {
      // Blocked DMs or a stale id — fall through to the listing below.
    }
  }
  const res = await discordFetch(token, "/users/@me/channels");
  if (!res) return null;
  const channels = (await res.json().catch(() => null)) as Array<{
    id: string;
    type: number;
    last_message_id?: string | null;
  }> | null;
  if (!Array.isArray(channels) || channels.length === 0) return null;
  // type 1 = DM. Message ids snowflake-sort chronologically, so the largest
  // last_message_id is the most recent conversation.
  const dms = channels.filter((c) => c.type === 1);
  if (dms.length === 0) return null;
  const newest = dms.reduce((best, c) => {
    const a = BigInt(c.last_message_id ?? "0");
    const b = BigInt(best.last_message_id ?? "0");
    return a > b ? c : best;
  });
  return newest.id;
}

/** Posts an embed to the owner's DM. No-op without a bot token. */
export async function notifyOwnerDm(embed: Embed): Promise<NotifyResult> {
  const token = await readSecret("DISCORD_BOT_TOKEN");
  if (!token) return ok;
  if (!(await notificationsActive()))
    return { sent: false, reason: "muted or no owner registered" };
  try {
    const channelId = await findOwnerDmChannel(token);
    // No DM yet: the owner has never messaged the bot, so there is nobody to
    // DM. Not an error — just nothing to do.
    if (!channelId) return { sent: false, reason: "no DM channel with the bot yet" };
    await discordFetch(token, `/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ embeds: [embed] }),
    });
    return { sent: true };
  } catch (error) {
    // A failed notification must never fail the operation that triggered it.
    console.error("[notify] DM failed:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "discord error" };
  }
}

/** Posts an embed to the announce webhook, if one is configured. */
export async function notifyAnnounceChannel(embed: Embed): Promise<NotifyResult> {
  const url = await readSecret("DISCORD_ANNOUNCE_WEBHOOK_URL");
  if (!url) return ok;
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
    return { sent: true };
  } catch (error) {
    console.error("[notify] webhook failed:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "webhook error" };
  }
}

/** True when at least one notification transport is configured. */
export async function isNotifyConfigured(): Promise<boolean> {
  return Boolean(
    (await readSecret("DISCORD_BOT_TOKEN")) || (await readSecret("DISCORD_ANNOUNCE_WEBHOOK_URL")),
  );
}

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------

/** Convenience: build and send the weekly digest. Skips when nothing happened. */
export async function sendWeeklyDigest(
  entries: ActivityEntry[],
  now: Date,
  siteUrl: string,
): Promise<NotifyResult> {
  const digest = buildDigest(entries, now, 7);
  if (digest.quiet) return { sent: false, reason: "quiet week" };
  return notifyOwnerDm(buildDigestEmbed(digest, siteUrl));
}
