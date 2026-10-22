// Who to notify, and whether proactive notifications are switched on.
//
// A tiny, separate document (its own row) rather than part of the store: it is
// written by the local bot and read by cron tasks, so there is no reason for it
// to contend with — or bloat — the CMS document.
//
// WHY THE BOT REGISTERS THE ID
// Opening a DM in Discord needs the recipient's numeric user id. `GET
// /users/@me/channels` does not reliably return old DM conversations, so
// discovering the id that way silently stops working once a conversation goes
// quiet. Rather than making you go and look up your own user id, the bot sends
// it along with the DMs you already send it, and we store it here.

import { readAuxRow, writeAuxRow } from "@/lib/store";
import { cooldownRemainingMs, TEST_DIGEST_COOLDOWN_MS } from "./notify-throttle.ts";

/** How the most recent test DM ended up, for the panel's history line. */
export type LastTestDigest = {
  /** Epoch milliseconds of the attempt. */
  at: number;
  sent: boolean;
  /** Transport reason when it failed. */
  reason?: string;
};

export type NotifyConfig = {
  /** Discord user id of the portfolio owner. */
  ownerDiscordId?: string;
  /** Set false to mute all proactive notifications. */
  enabled?: boolean;
  /** When the admin last claimed a test-send slot — throttles the button. */
  lastTestDigestAt?: number;
  /** The outcome of the last test send, shown under the digest preview. */
  lastTestDigest?: LastTestDigest;
};

const CONFIG_KEY = "zyn-notify-v1";

/** Reads the config, falling back to an empty one on any failure. */
export async function getNotifyConfig(): Promise<NotifyConfig> {
  try {
    const row = await readAuxRow<NotifyConfig>(CONFIG_KEY);
    return row?.doc ?? {};
  } catch {
    return {};
  }
}

/**
 * Records the owner's Discord id. Called by the ingest route on every DM, so it
 * self-heals: a new bot token or a new machine picks the id back up with no
 * manual step.
 */
export async function setOwnerDiscordId(userId: string): Promise<void> {
  // Discord snowflakes are numeric strings. Reject anything else rather than
  // storing a malformed id that would break DM delivery later.
  if (!/^\d{5,25}$/.test(userId)) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await readAuxRow<NotifyConfig>(CONFIG_KEY).catch(() => null);
    const current = row?.doc ?? {};
    if (current.ownerDiscordId === userId) return; // already known
    const next: NotifyConfig = {
      ...current,
      ownerDiscordId: userId,
      enabled: current.enabled ?? true,
    };
    const written = await writeAuxRow(CONFIG_KEY, next, row?.version ?? null).catch(() => null);
    if (written?.status === "ok") return;
    if (written?.status === "failed") return; // backend down — stay quiet
    // Conflict: re-read and try again.
  }
}

/** Mutes or unmutes proactive notifications, leaving the owner id intact. */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await readAuxRow<NotifyConfig>(CONFIG_KEY).catch(() => null);
    const next: NotifyConfig = { ...(row?.doc ?? {}), enabled };
    const written = await writeAuxRow(CONFIG_KEY, next, row?.version ?? null).catch(() => null);
    if (written?.status === "ok" || written?.status === "failed") return;
  }
}

/**
 * Atomically claims the right to send a test digest. Returns the milliseconds to
 * wait when it's too soon — 0 means go ahead.
 *
 * WHY A CAS AND NOT A MODULE VARIABLE: a Worker runs in many isolates, so an
 * in-memory timestamp would only throttle whichever one answered. This row is
 * shared, which makes the compare-and-swap a real gate: when two clicks race,
 * the loser's write conflicts, re-reads, sees the winner's fresh timestamp and
 * is throttled like any other early click.
 *
 * Fails open when the row can't be written: bookkeeping being unavailable is not
 * a good reason to stop the owner testing their Discord setup.
 */
export async function claimTestDigestSlot(
  now: number,
  cooldownMs: number = TEST_DIGEST_COOLDOWN_MS,
): Promise<number> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await readAuxRow<NotifyConfig>(CONFIG_KEY).catch(() => null);
    const last = typeof row?.doc.lastTestDigestAt === "number" ? row.doc.lastTestDigestAt : 0;
    const remaining = cooldownRemainingMs(now, last, cooldownMs);
    if (remaining > 0) return remaining;
    const next: NotifyConfig = { ...(row?.doc ?? {}), lastTestDigestAt: now };
    const written = await writeAuxRow(CONFIG_KEY, next, row?.version ?? null).catch(() => null);
    if (written?.status === "ok") return 0;
    if (written?.status === "failed") return 0;
    // Conflict: another click claimed the slot first. Re-read and let the
    // cooldown check above decide, rather than sending a second DM.
  }
  return 0;
}

/**
 * Records how a test DM ended up, so the panel can say "last test 4 minutes ago
 * — sent" instead of forgetting the moment the toast disappears.
 *
 * Best-effort: this is a convenience record, and losing it must never fail a
 * send that already worked. It still retries a conflict, because a concurrent
 * write (the ingest route registering the owner id, say) would otherwise erase
 * the only trace that the DM went out.
 */
export async function recordTestDigestOutcome(
  at: number,
  sent: boolean,
  reason?: string,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await readAuxRow<NotifyConfig>(CONFIG_KEY).catch(() => null);
    const next: NotifyConfig = {
      ...(row?.doc ?? {}),
      lastTestDigest: { at, sent, ...(reason ? { reason } : {}) },
    };
    const written = await writeAuxRow(CONFIG_KEY, next, row?.version ?? null).catch(() => null);
    if (written?.status === "ok" || written?.status === "failed") return;
  }
}
