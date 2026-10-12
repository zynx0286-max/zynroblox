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

export type NotifyConfig = {
  /** Discord user id of the portfolio owner. */
  ownerDiscordId?: string;
  /** Set false to mute all proactive notifications. */
  enabled?: boolean;
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

/** True when notifications are configured AND not muted. */
export async function notificationsActive(): Promise<boolean> {
  const config = await getNotifyConfig();
  return config.enabled !== false && Boolean(config.ownerDiscordId);
}
