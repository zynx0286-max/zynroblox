// Tests for the bot heartbeat's pure logic (src/lib/bot-heartbeat.ts).
// What's provable here is exactly what a wrong liveness signal would break:
// sanitization of bot-supplied text, the write-coalescing rule (a 5-minute
// ping must not hammer Supabase on every ping), and the last-seen formatting
// the doctor surfaces — including the two ways a timestamp can lie (stale,
// skewed).
//
// RUNTIME NOTE: this test file imports its subject with a relative `.ts`
// path — the bare Node test runner has no tsconfig-paths resolution, so the
// subject must not pull in anything beyond what it already does. It reaches
// the store through `@/lib/store`, which works under `node --test` because
// vite's alias applies only to bundled code — but the STORE-BOUND functions
// are deliberately NOT tested here (they need a real backend); the pure half
// carries the rules.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeHeartbeat,
  heartbeatWriteNeeded,
  formatLastSeen,
  formatHealth,
  healthIsDegraded,
  STALE_AFTER_MS,
} from "./bot-heartbeat-rules.ts";

test("sanitizeHeartbeat keeps a short status string", () => {
  assert.deepEqual(sanitizeHeartbeat({ status: "ready" }), { status: "ready" });
});

test("sanitizeHeartbeat trims, caps length, and drops empty/garbage", () => {
  assert.deepEqual(sanitizeHeartbeat({ status: "  ready  " }), { status: "ready" });
  const long = "x".repeat(100);
  assert.equal(sanitizeHeartbeat({ status: long }).status?.length, 40);
  assert.deepEqual(sanitizeHeartbeat({ status: "   " }), {});
  assert.deepEqual(sanitizeHeartbeat({ status: 42 }), {});
  assert.deepEqual(sanitizeHeartbeat(null), {});
  assert.deepEqual(sanitizeHeartbeat("ready"), {});
});

const MIN = heartbeatWriteNeeded.length ? 5 * 60 * 1000 : 0;

test("heartbeatWriteNeeded: never-pinged bot writes; fresh row coalesces", () => {
  const now = 1_000_000_000;
  assert.equal(heartbeatWriteNeeded(null, { nowMs: now, minIntervalMs: 300_000 }), true);
  assert.equal(
    heartbeatWriteNeeded(
      { lastSeenAt: now - 60_000, status: "ready" },
      { nowMs: now, minIntervalMs: 300_000 },
    ),
    false,
  ); // 1 min old vs 5 min coalesce window
  assert.equal(
    heartbeatWriteNeeded({ lastSeenAt: now - 301_000 }, { nowMs: now, minIntervalMs: 300_000 }),
    true,
  ); // older than the window — write
});

test("heartbeatWriteNeeded ignores a row with a corrupt timestamp", () => {
  assert.equal(
    heartbeatWriteNeeded({ lastSeenAt: Number.NaN } as { lastSeenAt: number }, {
      nowMs: 1_000,
      minIntervalMs: 0,
    }),
    true,
  );
});

test("formatLastSeen: never / moments / minutes", () => {
  const now = 1_000_000_000_000;
  assert.match(formatLastSeen(null, now), /never/);
  assert.equal(formatLastSeen({ lastSeenAt: now - 30_000 }, now), "moments ago");
  assert.equal(formatLastSeen({ lastSeenAt: now - 2 * 60_000 }, now), "2 minutes ago");
  assert.equal(formatLastSeen({ lastSeenAt: now - 60_000 }, now), "1 minute ago");
});

test("formatLastSeen flags staleness — the whole point of remote liveness", () => {
  const now = 1_000_000_000_000;
  const stale = now - STALE_AFTER_MS - 60_000;
  const text = formatLastSeen({ lastSeenAt: stale }, now);
  assert.match(text, /minutes? ago/);
  assert.match(text, /stale\?/);
  // Long-dead bot (many hours): the doctor must treat this naming the failure.
  const text2 = formatLastSeen({ lastSeenAt: now - 26 * 3_600_000 }, now);
  assert.match(text2, /26h ago/);
  assert.match(text2, /STALE.*probably down/);
});

test("formatLastSeen survives clock skew without going negative", () => {
  const now = 1_000_000_000_000;
  const ahead = formatLastSeen({ lastSeenAt: now + 90_000 }, now);
  assert.equal(ahead, "moments ago");
});

// --- gateway health telemetry (ping / reconnects / dmErrors) -----------------

test("sanitizeHeartbeat clamps telemetry into sane ranges", () => {
  assert.deepEqual(sanitizeHeartbeat({ pingMs: 45 }), { pingMs: 45 });
  assert.equal(sanitizeHeartbeat({ pingMs: 1e9 }).pingMs, 60_000, "a lying ping is clamped");
  assert.deepEqual(sanitizeHeartbeat({ reconnects: 2.9 }), { reconnects: 3 }, "rounded");
  assert.deepEqual(sanitizeHeartbeat({ dmErrors: "5" }), { dmErrors: 5 }, "numeric strings ok");
  assert.deepEqual(sanitizeHeartbeat({ pingMs: -3 }), {}, "negative ping dropped");
  assert.deepEqual(sanitizeHeartbeat({ reconnects: Number.NaN }), {}, "NaN dropped");
  assert.deepEqual(sanitizeHeartbeat({ pingMs: "fast" }), {}, "garbage dropped");
  assert.deepEqual(sanitizeHeartbeat({ reconnects: 1e12 }).reconnects, 10_000, "counts capped");
});

test("sanitizeHeartbeat keeps working with legacy status-only payloads", () => {
  assert.deepEqual(sanitizeHeartbeat({ status: "ready" }), { status: "ready" });
  assert.deepEqual(sanitizeHeartbeat({ status: "ready", pingMs: 0 }), {
    status: "ready",
    pingMs: 0,
  });
});

test("formatHealth composes the readable summary; empty for legacy rows", () => {
  assert.equal(formatHealth(null), "");
  assert.equal(formatHealth({ lastSeenAt: 1 }), "");
  assert.equal(
    formatHealth({ lastSeenAt: 1, status: "ready", pingMs: 45 }),
    "gateway ready, ping 45ms",
  );
  assert.equal(
    formatHealth({ lastSeenAt: 1, reconnects: 4, dmErrors: 1 }),
    "4 reconnect(s), 1 DM error(s)",
  );
});

test("healthIsDegraded: many reconnects or any DM error, not a fresh healthy bot", () => {
  assert.equal(healthIsDegraded(null), false);
  assert.equal(healthIsDegraded({ lastSeenAt: 1, status: "ready", pingMs: 40 }), false);
  assert.equal(healthIsDegraded({ lastSeenAt: 1, reconnects: 3 }), true);
  assert.equal(healthIsDegraded({ lastSeenAt: 1, reconnects: 1 }), false);
  assert.equal(healthIsDegraded({ lastSeenAt: 1, dmErrors: 1 }), true);
});

test("a stale readout still carries the last-known health", () => {
  const now = 1_000_000_000_000;
  const text = formatLastSeen({ lastSeenAt: now - 26 * 3_600_000, pingMs: 45 }, now);
  assert.match(text, /STALE/);
  assert.match(text, /ping 45ms/);
});
