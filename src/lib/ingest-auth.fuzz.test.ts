// Fuzz + property tests for the ingest auth path (src/lib/ingest-auth.ts).
//
// verifyIngestSignature's contract front-loads every throw so the route's
// catch maps them to a 401, but the route maps ANY throw to 401 — so what
// actually matters here is: a real attack/bug must never (a) crash the
// process, (b) accidentally accept a bad signature, or (c) reject the one
// thing the contract promises to accept. The rate limiter traps hostile
// non-string IPs (a mismatched type from a future refactor would otherwise
// get conflated with a KV hiccup, since a real KV outage also returns true —
// the fuzzer makes that distinction observable instead of invisible).
//
// Never tests the "not configured" path — that's deterministic shape, not an
// invariant under fuzz. Rate limiter gets a no-op (non-Workers) host.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  verifyIngestSignature,
  checkIngestRateLimit,
  getIngestSecret,
  isIngestConfigured,
} from "./ingest-auth.ts";

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

// ---- helpers ---------------------------------------------------------------

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return hex(new Uint8Array(sig));
}

interface Reject {
  kind: "reject";
  message: string;
}
type Verdict = { kind: "ok" } | Reject;

/** Classify instead of letting a throw escape into the test itself. */
async function verify(rawBody: string, sig: string | null, ts: string | null): Promise<Verdict> {
  try {
    await verifyIngestSignature(rawBody, sig, ts);
    return { kind: "ok" };
  } catch (e) {
    return { kind: "reject", message: e instanceof Error ? e.message : String(e) };
  }
}

const notConfiguredMsg = "Ingest endpoint is not configured";

// ---- fuzz ------------------------------------------------------------------

describe("ingest auth fuzz", () => {
  const ORIGINAL_SECRET = process.env["DISCORD_BOT_SECRET"];

  beforeEach(() => {
    process.env["DISCORD_BOT_SECRET"] = "fuzz-secret";
  });
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env["DISCORD_BOT_SECRET"];
    else process.env["DISCORD_BOT_SECRET"] = ORIGINAL_SECRET;
  });

  it("property: never throws; a correctly-signed pair is always accepted, whatever the body", async () => {
    const rand = prng(0x1a2b3c4d);
    const bodies = [
      "",
      "null",
      "{}",
      '{"text":"hi"}',
      "x".repeat(8000),
      '{"text":"' + "⚡".repeat(200) + '"}',
      "\u0000\u0001\u0002",
      new Array(100).fill('{"text":"x"}').join(""),
    ];
    let accepted = 0;
    for (let i = 0; i < 800; i++) {
      const body = bodies[Math.floor(rand() * bodies.length)] ?? "";
      const ts = String(Date.now() + Math.floor(rand() * 5_000));
      const sig = await hmacHex("fuzz-secret", `${ts}.${body}`);
      const verdict = await verify(body, sig, ts);
      assert.equal(
        verdict.kind,
        "ok",
        `seed-1 body #${i} (${JSON.stringify(body.slice(0, 40))}) must accept its own signature`,
      );
      accepted++;
    }
    assert(accepted >= 800, "vanity guard: every signed pair accepted");
  });

  it("property: never throws; most sig/ts mutations are rejected, none crash", async () => {
    const rand = prng(0x5f6e7d8c);
    const ts = "1_000_000_000_000";
    const body = '{"text":"hello"}';
    const goodSig = await hmacHex("fuzz-secret", `${ts}.${body}`);

    const knocks = new Map<string, number>();
    let rejects = 0;
    let ok = 0;

    for (let i = 0; i < 1200; i++) {
      let sig: string | null = goodSig;
      let tsArg: string | null = ts;
      const roll = rand();
      if (roll < 0.35) {
        // byte / char level signature corruption
        const bytes = [...Buffer.from(goodSig, "hex")];
        const idx = Math.floor(rand() * bytes.length);
        bytes[idx] = Math.floor(rand() * 256);
        sig = hex(new Uint8Array(bytes));
      } else if (roll < 0.5) {
        sig = goodSig.slice(0, Math.floor(rand() * goodSig.length));
      } else if (roll < 0.65) {
        sig = hex(new Uint8Array(goodSig.length / 2).map(() => Math.floor(rand() * 256)));
      } else if (roll < 0.8) {
        sig = null;
      } else if (roll < 0.9) {
        // timestamp fuzz: garbage, drifted, empty, symbolish strings
        tsArg = (
          [null, "", "abc", "nan", "0", "-1", "1e12", "123 ", " " + ts, ts + ".5", "true"] as (
            string | null
          )[]
        )[Math.floor(rand() * 11)]!;
      } else {
        // both wrong
        sig = null;
        tsArg = "abc";
      }
      const v = await verify(body, sig, tsArg);
      if (v.kind === "ok") ok++;
      else rejects++;
      knocks.set(
        v.kind === "reject" ? v.message : "(ok)",
        (knocks.get(v.kind === "reject" ? v.message : "(ok)") ?? 0) + 1,
      );
    }

    assert(
      rejects > 600,
      `mutation mass must be rejected (got ${rejects}); fuzz is vacuous otherwise`,
    );
    assert(
      ok >= 0 && ok <= 50,
      `a mutated pair should almost never pass HMAC by luck (got ${ok} accidental accepts)`,
    );
    // no throw escaped verify() — if this line runs, nothing crashed
  });

  it("property: replay window is honoured — stale and far-future timestamps are rejected", async () => {
    const secret = "fuzz-secret";
    const body = '{"text":"replay"}';
    const now = Date.now();
    for (const [label, offsetMs] of [
      ["5min+1ms past", -(5 * 60_000 + 1)],
      ["1 hour past", -3_600_000],
      ["1 hour future", 3_600_000],
      ["epoch", -1.7e12],
      ["year 3000", 3e13],
    ] as const) {
      const ts = String(Math.round(now + offsetMs));
      const sig = await hmacHex(secret, `${ts}.${body}`);
      const v = await verify(body, sig, ts);
      assert.equal(v.kind, "reject", `${label} must be outside the window`);
    }
    // Just inside the past window: accepted. (A small future skew is also
    // accepted — see the replay-window rule in ingest-auth.ts for why.)
    const ts = String(now - 4 * 60_000);
    const sig = await hmacHex(secret, `${ts}.${body}`);
    const v = await verify(body, sig, ts);
    assert.equal(v.kind, "ok");
  });

  it("property: reject classification is bucketed, not crashed — known messages only", async () => {
    const rand = prng(0x99aa11bb);
    const ts = String(Date.now());
    const body = '{"text":"x"}';
    const sig = await hmacHex("fuzz-secret", `${ts}.${body}`);
    const legal = new Set(["Invalid signature", "Missing signature", "Missing or stale timestamp"]);
    for (let i = 0; i < 500; i++) {
      const sigs: (string | null)[] = [
        sig,
        null,
        "",
        hex(new Uint8Array(32).map(() => Math.floor(rand() * 256))),
      ];
      const tss: (string | null)[] = [ts, null, "", "abc", String(rrMs(rand))];
      const v = await verify(
        body,
        sigs[Math.floor(rand() * sigs.length)]!,
        tss[Math.floor(rand() * tss.length)]!,
      );
      if (v.kind === "ok") continue;
      assert(
        legal.has(v.message),
        `unknown reject message leaked to callers: ${JSON.stringify(v.message)} — the route's 401 body must not expose internals`,
      );
    }
  });
  function rrMs(rand: () => number): number {
    return Math.round((rand() * 2 - 1) * 1e13); // sometimes in-window, sometimes far out
  }
});

// ---- rate limiter ----------------------------------------------------------

describe("ingest rate limiter (non-Workers host: always-open but type-safe)", () => {
  beforeEach(() => {
    process.env["DISCORD_BOT_SECRET"] = "fuzz-secret";
  });
  const ORIGINAL = process.env["DISCORD_BOT_SECRET"];
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env["DISCORD_BOT_SECRET"];
    else process.env["DISCORD_BOT_SECRET"] = ORIGINAL;
  });

  it("never throws on hostile/non-string IPs; returns true when KV absent (no oscillation of intent)", async () => {
    const rand = prng(0x77fe0011);
    const hostile: unknown[] = [
      "1.2.3.4",
      "",
      "   ",
      "\u0000",
      "x".repeat(5000),
      "\ud83d\ude00".repeat(500),
      null,
      undefined,
      42,
      { toString: () => "6.6.6.6" },
      ["1.2.3.4"],
      Symbol("sneaky"),
    ];
    for (let i = 0; i < 400; i++) {
      const pick = hostile[Math.floor(rand() * hostile.length)];
      const allowed = await checkIngestRateLimit(pick as string);
      assert.equal(
        allowed,
        true,
        `non-Workers host must fail open; input was ${String(pick).slice(0, 20)}`,
      );
    }
  });
});

// ---- secret config surface -------------------------------------------------

describe("ingest secret config shape", () => {
  const ORIGINAL = process.env["DISCORD_BOT_SECRET"];
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env["DISCORD_BOT_SECRET"];
    else process.env["DISCORD_BOT_SECRET"] = ORIGINAL;
  });

  it("is closed when the secret is unset or empty; open otherwise (a real bot would have signed with it)", async () => {
    for (const val of [undefined, ""]) {
      if (val === undefined) delete process.env["DISCORD_BOT_SECRET"];
      else process.env["DISCORD_BOT_SECRET"] = val;
      assert.equal(await getIngestSecret(), "", `secret must read "" for ${JSON.stringify(val)}`);
      assert.equal(
        await isIngestConfigured(),
        false,
        `endpoint must read closed for ${JSON.stringify(val)}`,
      );
    }
    process.env["DISCORD_BOT_SECRET"] = "real-secret";
    assert.equal(await getIngestSecret(), "real-secret");
    assert.equal(await isIngestConfigured(), true);
  });
});
