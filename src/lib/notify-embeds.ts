// The cards the owner sees in Discord, built as plain data.
//
// WHY THIS IS NOT IN discord-notify.ts
// That module holds the transports, and transports reach for secrets and the
// store — which drags in the whole asset graph. The tests need the payloads but
// none of that, so the pure half lives here: importing this file costs nothing
// but a couple of pure functions, and the test runner can load it directly.

import type { ActivityEntry } from "@/lib/store";
import { digestHeadline, joinNames, type Digest } from "./digest.ts";
import { livenessDigestLine, type LivenessLastState } from "./bot-liveness-rules.ts";
import { formatHealth, type BotHeartbeat } from "./bot-heartbeat-rules.ts";
import type { LivenessDecision } from "./bot-liveness-rules.ts";

export type Embed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
};

/** The card posted when a new entry goes live. */
export function buildEntryAnnouncement(entry: ActivityEntry, siteUrl: string): Embed {
  const link = entry.slug ? `${siteUrl}/work/${entry.slug}` : siteUrl;
  const placeholder = entry.kind === "entry.placeholder";
  return {
    color: placeholder ? 0xf97316 : 0x22c55e,
    title: placeholder
      ? `⚠️ Added as a placeholder: ${entry.summary}`
      : `🎉 New on the site: ${entry.summary}`,
    description: placeholder
      ? "Roblox's API didn't answer, so this entry needs its real title and icon. " +
        "The nightly refresh will fill it in automatically."
      : "Added to the portfolio and live now.",
    fields: entry.slug ? [{ name: "Link", value: link, inline: true }] : [],
  };
}

/** The weekly DM. */
export function buildDigestEmbed(
  digest: Digest,
  siteUrl: string,
  liveness?:
    { state: LivenessLastState | null; nowMs: number; heartbeat?: BotHeartbeat | null } | undefined,
): Embed {
  const fields: Embed["fields"] = [];

  if (digest.completed.length > 0) {
    fields.push({
      name: "New entries",
      value: joinNames(digest.completed.map((e) => e.summary)),
    });
  }
  if (digest.needsAttention.length > 0) {
    fields.push({
      name: "⚠️ Needs a look",
      value: joinNames(digest.needsAttention.map((e) => e.summary)),
    });
  }
  if (digest.visibility.length > 0) {
    fields.push({
      name: "🔄 Published / drafted",
      value: joinNames(digest.visibility.map((e) => e.summary)),
    });
  }
  if (digest.merges.length > 0) {
    fields.push({
      name: "Merged duplicates",
      value: joinNames(digest.merges.map((e) => e.summary)),
    });
  }
  if (digest.refreshes.length > 0) {
    const last = digest.refreshes[digest.refreshes.length - 1];
    fields.push({
      name: "🌙 Nightly Roblox refresh",
      value: `${digest.refreshes.length} run(s). Last: ${last?.summary ?? "—"}`,
    });
  }
  if (digest.reviewSuggested.length > 0) {
    fields.push({
      name: "Roblox suggests a different name",
      value:
        `${digest.reviewSuggested.length} curated field(s) differ from Roblox's. ` +
        "They were left alone on purpose — change them in the admin panel if you agree.",
    });
  }

  if (liveness) {
    const line = livenessDigestLine(liveness.state, liveness.nowMs);
    if (line) {
      fields.push({ name: "🤖 Bot liveness", value: line });
    } else if (liveness.heartbeat) {
      const health = formatHealth(liveness.heartbeat);
      if (health) {
        fields.push({ name: "🤖 Bot health", value: `${health}.` });
      }
    }
  }

  return {
    color: digest.quiet ? 0x6b7280 : digest.needsAttention.length > 0 ? 0xf97316 : 0x3b82f6,
    title: digestHeadline(digest),
    description: digest.quiet
      ? `No new entries, visibility changes, merges or refresh results since ${digest.from.slice(0, 10)}.`
      : `${siteUrl}`,
    fields,
    footer: { text: "Portfolio digest — manage entries in the admin panel" },
  };
}

/** The bot-liveness watch's page: down, degraded, re-alert, or recovery. */
export function buildLivenessEmbed(decision: LivenessDecision, text: string): Embed {
  if (decision.action === "none") {
    return { color: 0x6b7280, title: "Bot liveness", description: text || decision.reason };
  }
  if (decision.action === "alert-recovered") {
    return {
      color: 0x22c55e,
      title: "✅ Bot is back online",
      description: text || decision.reason,
    };
  }
  if (decision.action === "alert-degraded") {
    return {
      color: 0xeab308,
      title: "⚠️ Bot is degraded (still up)",
      description: text || decision.reason,
    };
  }
  if (decision.action === "alert-degraded-recovered") {
    return {
      color: 0x22c55e,
      title: "✅ Bot health back to normal",
      description: text || decision.reason,
    };
  }
  if (decision.action === "alert-crash-loop") {
    return {
      color: 0xef4444,
      title: `🔁 Bot is crash-looping (${decision.flaps} restarts)`,
      description: text || decision.reason,
    };
  }
  return {
    color: decision.first ? 0xef4444 : 0xf97316,
    title: decision.first ? "🚨 Hosted bot is DOWN" : "⏰ Bot still down",
    description: text || decision.reason,
  };
}
