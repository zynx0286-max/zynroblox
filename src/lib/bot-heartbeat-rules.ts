// Pure rules for the bot heartbeat — no imports at all.
//
// SPLIT FROM ./bot-heartbeat.ts ON PURPOSE: the bare Node test runner cannot
// resolve the `@/` alias, and these are exactly the rules a wrong liveness
// signal would break. The store-bound half (get/set) lives beside them in
// bot-heartbeat.ts; the tests import THIS file directly.

/** Auxiliary-row key holding the bot's last heartbeat. */
export const HEARTBEAT_KEY = "zyn-bot-heartbeat-v1";

/** Auxiliary-row key holding the liveness watch's own memory (see bot-liveness-rules.ts). */
export const LIVENESS_STATE_KEY = "zyn-bot-liveness-v1";

export type BotHeartbeat = {
  /** Worker-side wall clock (ms) when the last heartbeat arrived. */
  lastSeenAt: number;
  /** Bot-reported gateway status label at that time ("ready" etc). */
  status?: string;
  /** Bot-reported gateway ping (ms), when the gateway had one. */
  pingMs?: number;
  /** Gateway disconnects since the process started (auto-reconnects included). */
  reconnects?: number;
  /** DM replies that failed (server errors or handler crashes) since start. */
  dmErrors?: number;
};

export const STALE_AFTER_MS = 30 * 60 * 1000; // bot pings every 5 min

/** Upper bounds for telemetry fields — a stale/garbage value can't overflow the row. */
const TELEMETRY_MAX = { ping: 60_000, reconnects: 10_000, dmErrors: 10_000 } as const;

/**
 * Validated non-negative integer, or undefined. Rejects garbage before it
 * reaches the row. NEVER throws: a Symbols/bigints/objects coerce-throws
 * (Number(Symbol()) is a TypeError), and a hostile-but-signed payload must
 * degrade to "field dropped", not an unhandled 500.
 */
function clampCount(value: unknown, max: number): number | undefined {
  try {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) return undefined;
    return Math.min(Math.round(n), max);
  } catch {
    return undefined; // Symbol, bigint→out of range, exotic toPrimitive: garbage
  }
}

/**
 * Validates a client-supplied heartbeat payload, keeping only sane fields.
 * `status` is advisory text for a human, capped like a log line; telemetry
 * numbers are clamped so a lying client can't store billion-millisecond pings.
 */
export function sanitizeHeartbeat(input: unknown): {
  status?: string;
  pingMs?: number;
  reconnects?: number;
  dmErrors?: number;
} {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: { status?: string; pingMs?: number; reconnects?: number; dmErrors?: number } = {};
  if (typeof raw["status"] === "string") {
    const status = raw["status"].trim().slice(0, 40);
    if (status) out.status = status;
  }
  const pingMs = clampCount(raw["pingMs"], TELEMETRY_MAX.ping);
  if (pingMs !== undefined) out.pingMs = pingMs;
  const reconnects = clampCount(raw["reconnects"], TELEMETRY_MAX.reconnects);
  if (reconnects !== undefined) out.reconnects = reconnects;
  const dmErrors = clampCount(raw["dmErrors"], TELEMETRY_MAX.dmErrors);
  if (dmErrors !== undefined) out.dmErrors = dmErrors;
  return out;
}

/**
 * Should a heartbeat write actually happen? The bot pings every few minutes
 * (unref'd interval); writing to Supabase on EVERY ping turns a liveness
 * signal into steady-state write traffic. Coalesce: skip when the stored row
 * is newer than the ping interval — one guaranteed write per window is the
 * whole signal.
 */
export function heartbeatWriteNeeded(
  stored: BotHeartbeat | null,
  incoming: { nowMs: number; minIntervalMs: number },
): boolean {
  if (!stored || typeof stored.lastSeenAt !== "number" || !Number.isFinite(stored.lastSeenAt)) {
    return true;
  }
  return incoming.nowMs - stored.lastSeenAt >= incoming.minIntervalMs;
}

/**
 * The human-readable health half of the readout, e.g.
 * "gateway ready, ping 45ms, 2 reconnect(s)". Empty when the bot is on an
 * older build that only reported presence — plain last-seen then.
 */
export function formatHealth(stored: BotHeartbeat | null): string {
  if (!stored) return "";
  const parts: string[] = [];
  if (stored.status) parts.push(`gateway ${stored.status}`);
  if (stored.pingMs !== undefined) parts.push(`ping ${stored.pingMs}ms`);
  if (stored.reconnects !== undefined && stored.reconnects > 0)
    parts.push(`${stored.reconnects} reconnect(s)`);
  if (stored.dmErrors !== undefined && stored.dmErrors > 0)
    parts.push(`${stored.dmErrors} DM error(s)`);
  return parts.join(", ");
}

/**
 * The heartbeat is FRESH but the gateway is struggling: repeated gateway
 * drops or failed DM replies. Not downtime — the doctor reports it as a
 * warning rather than a failure — but a bot that reconnects all day is
 * about to be a bot that doesn't reconnect at all.
 */
export function healthIsDegraded(stored: BotHeartbeat | null): boolean {
  if (!stored) return false;
  return (stored.reconnects ?? 0) >= 3 || (stored.dmErrors ?? 0) > 0;
}

/** "2 minutes ago — gateway ready, ping 45ms" — for the doctor's one-line readout. */
export function formatLastSeen(stored: BotHeartbeat | null, nowMs: number): string {
  if (!stored) return "never (bot has not pinged yet this deployment)";
  const ago = nowMs - stored.lastSeenAt;
  const health = formatHealth(stored);
  const suffix = health ? ` — ${health}` : "";
  if (ago < 0) return "moments ago"; // clock skew between isolates
  if (ago > STALE_AFTER_MS * 4) {
    const hours = Math.floor(ago / 3_600_000);
    return `${hours}h ago — STALE, the bot is probably down${suffix ? ` (last ${health})` : ""}`;
  }
  const minutes = Math.floor(ago / 60_000);
  if (minutes < 1) return `moments ago${suffix}`;
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago${ago > STALE_AFTER_MS ? " (stale?)" : ""}${suffix}`;
}
