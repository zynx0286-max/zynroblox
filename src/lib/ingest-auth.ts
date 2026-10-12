// HMAC authentication for the Discord-bot ingest endpoint. The bot signs the
// raw request body with DISCORD_BOT_SECRET; the Worker re-derives the same
// signature and compares timing-safely. A timestamp guards against replays.
// Mirrors the readSecret pattern from owner-session.ts.

import { createServerOnlyFn } from "@tanstack/react-start";

const readSecret = createServerOnlyFn(async (name: string): Promise<string> => {
  try {
    const cf = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
      env?: Record<string, unknown>;
    };
    const value = cf?.env?.[name];
    if (typeof value === "string" && value.length > 0) return value;
  } catch {
    // Not on Workers — fall through to process.env.
  }
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
});

/** The configured ingest shared secret, or "" when not set (endpoint closed). */
export async function getIngestSecret(): Promise<string> {
  return readSecret("DISCORD_BOT_SECRET");
}

/** True when the endpoint can accept requests. */
export async function isIngestConfigured(): Promise<boolean> {
  return (await getIngestSecret()).length > 0;
}

const REPLAY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Verifies `x-signature` (hex HMAC-SHA256 over the raw body) and
 * `x-timestamp` (ms epoch within the replay window). Throws on any failure
 * with a message safe to return to the caller.
 */
export async function verifyIngestSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): Promise<void> {
  const secret = await getIngestSecret();
  if (!secret) throw new Error("Ingest endpoint is not configured");

  const ts = Number(timestamp ?? "");
  if (!Number.isFinite(ts)) throw new Error("Missing or stale timestamp");
  const skew = Date.now() - ts;
  // Asymmetric replay window: the bot's clock runs a hair ahead of the Worker
  // on some hosts, so a small FUTURE skew is tolerated, but the past window
  // (where a captured request replays from) stays at +/- 5 min.
  if (skew > REPLAY_WINDOW_MS || skew < -15_000) {
    throw new Error("Missing or stale timestamp");
  }
  if (!signature) throw new Error("Missing signature");

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}.${rawBody}`));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // Timing-safe comparison (constant-time-ish; length check first).
  const a = Uint8Array.from(expected, (c) => c.charCodeAt(0));
  const b = Uint8Array.from(signature.trim().toLowerCase(), (c) => c.charCodeAt(0));
  if (a.length !== b.length || a.length === 0) throw new Error("Invalid signature");
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) throw new Error("Invalid signature");
}

/**
 * Simple per-IP rate limit backed by the STORE KV binding: a counter key with
 * a 1-hour TTL. Best-effort — when KV is unavailable the request still
 * passes (auth is the real gate).
 */
export async function checkIngestRateLimit(ip: string): Promise<boolean> {
  type RateLimitKv = {
    get(key: string, type: "json"): Promise<number | null>;
    put(key: string, value: string, options?: { expirationTtl: number }): Promise<void>;
  };
  let binding: RateLimitKv | null = null;
  try {
    const cf = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
      env?: Record<string, unknown>;
    };
    const maybe = cf?.env?.["STORE"];
    if (maybe && typeof (maybe as { get?: unknown }).get === "function") {
      binding = maybe as RateLimitKv;
    }
  } catch {
    return true;
  }
  if (!binding) return true;

  const key = `ingest-rl:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
  try {
    const current = (await binding.get(key, "json")) ?? 0;
    if (current >= 60) return false;
    await binding.put(key, String(current + 1), { expirationTtl: 3600 });
    return true;
  } catch {
    return true;
  }
}
