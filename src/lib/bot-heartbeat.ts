// Remote liveness for the hosted bot — the missing half of "is it online?"
//
// A hosting console can only prove the process started; a crash-free gateway
// can still sit effectively dead for hours (host network flap, gateway stall)
// and LOOK fine from the panel until the first DM goes unanswered. The fix:
// the running bot periodically POSTs a signed heartbeat to the Worker, which
// persists the last-seen time in its own aux row (same CAS protocol as
// everything else). Then:
//
//   * `npm run bot:doctor` (from anywhere) reports "bot last seen X ago" —
//     a stale heartbeat names the problem without waiting for you to DM it
//     and hear nothing.
//   * The bot's own local heartbeat log lines (uptime, shard status) stay for
//     the panel console; this row is the part that's checkable remotely.
//
// The heartbeat is STALENESS-TOLERANT by design: an hour of gap only means
// "already told you" — it never restarts anything or writes an alert. The
// weekly digest already surfaces what matters; this keeps the signal cheap.

import { readAuxRow, writeAuxRow } from "@/lib/store";

/** Coalesce window for heartbeat writes — matches the bot's 5-minute ping cadence. */
const PING_WINDOW_MS = 5 * 60 * 1000;

// The pure half lives in ./bot-heartbeat-rules.ts so the bare Node test
// runner can verify the rules without resolving the `@/` alias or touching
// a backend — same split as notify-embeds vs discord-notify.
import {
  HEARTBEAT_KEY,
  LIVENESS_STATE_KEY,
  heartbeatWriteNeeded,
  sanitizeHeartbeat,
  type BotHeartbeat,
} from "./bot-heartbeat-rules.ts";
import type { LivenessLastState } from "./bot-liveness-rules.ts";

export {
  HEARTBEAT_KEY,
  LIVENESS_STATE_KEY,
  STALE_AFTER_MS,
  formatLastSeen,
  formatHealth,
  healthIsDegraded,
  heartbeatWriteNeeded,
  sanitizeHeartbeat,
} from "./bot-heartbeat-rules.ts";
export type { BotHeartbeat } from "./bot-heartbeat-rules.ts";

/** The persisted heartbeat, or null when the bot has never pinged. */
export async function getBotHeartbeat(): Promise<BotHeartbeat | null> {
  try {
    const row = await readAuxRow<BotHeartbeat>(HEARTBEAT_KEY);
    const doc = row?.doc;
    if (!doc || typeof doc.lastSeenAt !== "number" || !Number.isFinite(doc.lastSeenAt)) {
      return null;
    }
    return doc;
  } catch {
    return null;
  }
}

/**
 * The liveness watch's own memory (one row): which side of fresh/down we last
 * reported and when — see bot-liveness-rules.ts. Kept in bot-heartbeat.ts
 * because it is the same "small state about the bot" concern and shares the
 * aux-row machinery.
 */
export async function getBotLastLiveness(): Promise<LivenessLastState | null> {
  try {
    const row = await readAuxRow<LivenessLastState>(LIVENESS_STATE_KEY);
    return row?.doc ?? null;
  } catch {
    return null;
  }
}

export async function setBotLastLiveness(state: LivenessLastState): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const row = await readAuxRow<LivenessLastState>(LIVENESS_STATE_KEY).catch(() => null);
    const written = await writeAuxRow(LIVENESS_STATE_KEY, state, row?.version ?? null).catch(
      () => null,
    );
    if (written?.status === "ok") return;
    if (written?.status === "failed") return;
  }
}

/**
 * Records a heartbeat. Called per bot ping, so contention is near-impossible —
 * one retry on conflict is plenty, and failure is silent by contract (a lost
 * liveness ping must never 500 the bot).
 *
 * Writes COALESCE through heartbeatWriteNeeded: the bot pings every 5 minutes,
 * and writing on every ping turns a liveness signal into steady-state write
 * traffic. One read per ping decides write-or-skip; the rule is unit-tested.
 */
export async function recordBotHeartbeat(payload: unknown): Promise<void> {
  const fields = sanitizeHeartbeat(payload);
  for (let attempt = 0; attempt < 2; attempt++) {
    const row = await readAuxRow<BotHeartbeat>(HEARTBEAT_KEY).catch(() => null);
    const stored = row?.doc ?? null;
    if (!heartbeatWriteNeeded(stored, { nowMs: Date.now(), minIntervalMs: PING_WINDOW_MS })) {
      return;
    }
    const next: BotHeartbeat = {
      lastSeenAt: Date.now(),
      ...(stored ?? {}),
      ...fields,
    };
    const written = await writeAuxRow(HEARTBEAT_KEY, next, row?.version ?? null).catch(() => null);
    if (written?.status === "ok") return;
    if (written?.status === "failed") return;
    // conflict — loop once and re-read
  }
}
