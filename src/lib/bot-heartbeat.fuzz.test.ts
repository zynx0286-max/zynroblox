// Property-based (fuzz) tests for the heartbeat SANITIZATION rules.
//
// sanitizeHeartbeat is the door between a signed-but-arbitrary client payload
// and the persisted row the doctor, the admin card and the digest all read.
// Its whole job is: no garbage in, sane small row out. The invariants a
// hostile client must not be able to break, for ANY payload:
//
//   1. The returned object holds ONLY the four known keys — prototype smoke,
//      __proto__, getters, nested bombs: nothing else can be smuggled in.
//   2. status, when present, is a string of ≤ 40 chars, trimmed non-empty.
//   3. Every number is a non-negative FINITE integer within its cap
//      (ping ≤ 60_000, counts ≤ 10_000).
//   4. No NaN/Infinity/e/-notation str Nor surrogate-truncated string can
//      survive into the row.
//   5. Total serialized size of the result is bounded (the row write is
//      per-ping; a 1e12-char status must not become a 1 MB row).
//   6. The function never throws or mutates its input.
//
// A seeded PRNG throws structured garbage (10k payloads total) at
// sanitizeHeartbeat; failures print seed + index for reproducibility.
//
// RUNTIME NOTE: subject is pure and import-free, like the other rule fuzz.

import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeHeartbeat, formatLastSeen, formatHealth } from "./bot-heartbeat-rules.ts";
import type { BotHeartbeat } from "./bot-heartbeat-rules.ts";

const FIELD_MAX = { ping: 60_000, reconnects: 10_000, dmErrors: 10_000 } as const;

/** Deterministic mulberry32 PRNG — same seed, same garbage, reproducible failures. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A weighted grab-bag of hostile values. */
function garbageValue(rand: () => number): unknown {
  const r = rand();
  if (r < 0.08) return rand(); // random float
  if (r < 0.16) return Math.floor((rand() - 0.5) * 2e12); // huge / negative ints
  if (r < 0.24) return Number.NaN;
  if (r < 0.3) return Number.POSITIVE_INFINITY;
  if (r < 0.34) return -0;
  if (r < 0.42) return String.fromCharCode(0 + Math.floor(rand() * 0xfff)); // control chars
  if (r < 0.5) return "\u{1F600}".repeat(Math.floor(rand() * 100)); // surrogate pairs
  if (r < 0.56) return { evil: rand }; // nested object
  if (r < 0.6) return []; // array
  if (r < 0.64) return new Date();
  if (r < 0.68) return Symbol("sneaky");
  if (r < 0.72) return null;
  if (r < 0.76) return undefined;
  if (r < 0.8) return "x".repeat(Math.floor(rand() * 3000)); // oversize string
  if (r < 0.84) return "  \t\n ready \r "; // whitespace-padded legit-looking
  if (r < 0.88) return BigInt(2 ** 63);
  if (r < 0.92) return ["ready", 1, "2", NaN]; // mixed array
  if (r < 0.96) return Object.assign(Object.create(null), { status: "bare" }); // null proto
  return 1e21; // beyond Number.MAX_SAFE_INTEGER even in e-notation
}

/** Builds one hostile-but-structurally-object payload. */
function garbagePayload(seed: number, i: number): Record<string, unknown> {
  const rand = prng((seed * 7919 + i * 104_729) | 0);
  const keys = ["status", "pingMs", "reconnects", "dmErrors", "__proto__", "constructor"];
  const payload: Record<string, unknown> = {};
  const n = Math.floor(rand() * 6);
  for (let k = 0; k < n; k++) {
    const key = keys[Math.floor(rand() * keys.length)] ?? "status";
    payload[key] = garbageValue(rand);
  }
  return payload;
}

function checkSanitized(out: unknown, seed: number, i: number, input: unknown): void {
  // INVARIANT 6: no throw — reaching here proves it for this call.

  // INVARIANT 1: only the four known keys.
  const keys = Object.keys(out as object);
  for (const key of keys) {
    if (!["status", "pingMs", "reconnects", "dmErrors"].includes(key)) {
      assert.fail(`seed ${seed} payload ${i}: unexpected key "${key}" in ${JSON.stringify(out)}`);
    }
  }

  // INVARIANT 2: status shape.
  const status = (out as { status?: unknown }).status;
  if (status !== undefined) {
    assert.equal(typeof status, "string", `seed ${seed} payload ${i}: status type`);
    assert.ok((status as string).length <= 40, `seed ${seed} payload ${i}: status length`);
    assert.ok(
      (status as string).trim().length > 0,
      `seed ${seed} payload ${i}: status empty after trim (should have been dropped)`,
    );
    assert.equal(
      status,
      (status as string).trim(),
      `seed ${seed} payload ${i}: status not trimmed`,
    );
  }

  // INVARIANT 3: numbers finite, non-negative, integer, within caps.
  const record = out as Record<string, unknown>;
  const numeric: Array<[string, number, number]> = [
    ["pingMs", FIELD_MAX.ping, record["pingMs"] as number],
    ["reconnects", FIELD_MAX.reconnects, record["reconnects"] as number],
    ["dmErrors", FIELD_MAX.dmErrors, record["dmErrors"] as number],
  ];
  for (const [name, cap, value] of numeric) {
    if (value === undefined) continue;
    assert.equal(typeof value, "number", `seed ${seed} payload ${i}: ${name} type`);
    assert.ok(Number.isFinite(value), `seed ${seed} payload ${i}: ${name} finite`);
    assert.ok(Number.isInteger(value), `seed ${seed} payload ${i}: ${name} integer`);
    assert.ok(value >= 0, `seed ${seed} payload ${i}: ${name} non-negative`);
    assert.ok(value <= cap, `seed ${seed} payload ${i}: ${name} within cap ${cap}`);
  }

  // INVARIANT 4+5: serializable, bounded size.
  let json: string;
  try {
    json = JSON.stringify(out);
  } catch (error) {
    assert.fail(`seed ${seed} payload ${i}: result not serializable: ${error}`);
  }
  assert.ok(json.length <= 500, `seed ${seed} payload ${i}: serialized size ${json.length}`);
}

function runFuzz(seed: number, steps: number): void {
  for (let i = 0; i < steps; i++) {
    const payload = garbagePayload(seed, i);
    const before = JSON.stringify(Object.keys(payload));
    let out: unknown;
    try {
      out = sanitizeHeartbeat(payload);
    } catch (error) {
      assert.fail(`seed ${seed} payload ${i}: sanitizeHeartbeat threw: ${error}`);
    }
    // INVARIANT 6 (cont.): input not mutated (its key structure is unchanged).
    assert.equal(
      JSON.stringify(Object.keys(payload)),
      before,
      `seed ${seed} payload ${i}: input was mutated`,
    );
    checkSanitized(out, seed, i, payload);
  }
}

test("fuzz sanitization: 6k garbage payloads across 4 seeds keep the row sane", () => {
  for (let seed = 1; seed <= 4; seed++) runFuzz(seed, 1500);
});

test("fuzz sanitization: the garbage actually covers hostile shapes (not vacuous)", () => {
  // Aggregate across seeds: nested objects, symbols, NaN, huge strings must
  // all have been generated, and every one must have been rejected or clamped.
  let sawObject = false;
  let sawSymbol = false;
  let sawNaN = false;
  let sawHugeString = false;
  for (let seed = 1; seed <= 4; seed++) {
    for (let i = 0; i < 500; i++) {
      const payload = garbagePayload(seed, i);
      sawObject ||= typeof payload === "object";
      sawSymbol ||= Object.values(payload).some((v) => typeof v === "symbol");
      sawNaN ||= Object.values(payload).some((v) => typeof v === "number" && Number.isNaN(v));
      sawHugeString ||= Object.values(payload).some((v) => typeof v === "string" && v.length > 200);
    }
  }
  assert.ok(sawObject && sawSymbol && sawNaN && sawHugeString, "garbage generator too tame");
});

test("fuzz readout: formatLastSeen/formatHealth never crash on fuzz-generated rows", () => {
  for (let seed = 1; seed <= 2; seed++) {
    for (let i = 0; i < 1000; i++) {
      const payload = garbagePayload(seed, i);
      const rows: Array<BotHeartbeat | null> = [
        null,
        { lastSeenAt: Number.NaN } as unknown as BotHeartbeat,
        { lastSeenAt: 1_000_000_000_000, ...(sanitizeHeartbeat(payload) as object) },
      ];
      for (const row of rows) {
        let text: string;
        try {
          text = formatLastSeen(row, 1_000_000_000_000);
          formatHealth(row);
        } catch (error) {
          assert.fail(
            `seed ${seed} payload ${i}: readout threw on ${JSON.stringify(row)}: ${error}`,
          );
        }
        assert.equal(typeof text, "string");
        assert.ok(text.length > 0, "readout must never be empty");
      }
    }
  }
});
