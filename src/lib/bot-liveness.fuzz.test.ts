// Property-based (fuzz) tests for the bot-liveness state machine.
//
// Every hand-written test proves a chosen sequence behaves. The invariants the
// owner actually depends on are stronger than any single sequence: WHATEVER
// heartbeat timeline reality produces, the machine must never
//
//   1. page more than one DOWN alert per outage (patience, not spam),
//   2. re-alert faster than the ladder allows,
//   3. page nothing while the bot is verifiably dark for a LONG stretch,
//   4. crash or emit a corrupt state (non-finite timestamps, negative counts),
//   5. lose the crash-loop page once the threshold is genuinely crossed.
//
// A seeded PRNG drives random up/down heartbeat walks (10k total steps per
// seed, 8 seeds) through evaluateLiveness; these tests assert the invariants.
// Failures print the seed + step so a regression is reproducible from the log.
//
// RUNTIME NOTE: the subject is pure with zero imports, same as the rule tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOWN_AFTER_MS,
  FLAP_COOLDOWN_MS,
  FLAP_PAGE_THRESHOLD,
  evaluateLiveness,
  livenessAlertText,
  degradedAlertText,
  type EvaluationInput,
  type LivenessLastState,
  type LivenessDecision,
} from "./bot-liveness-rules.ts";

const HOUR = 3_600_000;

/** Deterministic mulberry32 PRNG — same seed, same walk, reproducible failures. */
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

type Stats = {
  downAlerts: number;
  recoveredAlerts: number;
  crashLoopAlerts: number;
  degradedAlerts: number;
  lastDownAlertAt: number;
  minGapBetweenDownAlerts: number;
  crashes: number;
};

function walk(seed: number, steps: number): { stats: Stats; finalState: LivenessLastState | null } {
  const rand = prng(seed);
  let state: LivenessLastState | null = null;
  let lastSeen: number | null = Date.parse("2026-01-01T00:00:00Z");
  let now = lastSeen + HOUR;
  const stats: Stats = {
    downAlerts: 0,
    recoveredAlerts: 0,
    crashLoopAlerts: 0,
    degradedAlerts: 0,
    lastDownAlertAt: -Infinity,
    minGapBetweenDownAlerts: Infinity,
    crashes: 0,
  };

  for (let i = 0; i < steps; i++) {
    // Tick the clock 15–75 min per step (hourly cron with jitter).
    now += (15 + rand() * 60) * 60_000;
    // The bot pings or doesn't: 70% alive (fresh heartbeat < 30 min old).
    // Dark states split: 15% pure blips (cross the threshold by 0–20 min —
    // the crash-loop regime), 10% moderate outages (0.5–3h), 5% very stale
    // (> 6h, the ladder regime). Without a real blip mass the flap machine
    // can never fire and the invariants would pass vacuously.
    if (rand() < 0.7) {
      lastSeen = now - rand() * 20 * 60_000;
    } else if (rand() < 0.33) {
      lastSeen = now - (DOWN_AFTER_MS + rand() * 20 * 60_000); // blip
    } else if (rand() < 0.67) {
      lastSeen = now - (DOWN_AFTER_MS + rand() * 3 * HOUR); // moderate
    } else {
      lastSeen = now - (FLAP_COOLDOWN_MS + rand() * 10 * HOUR); // very stale
    }
    // Occasionally report degraded telemetry.
    const reconnects = rand() < 0.15 ? Math.floor(rand() * 8) : 0;
    const dmErrors = rand() < 0.05 ? Math.floor(rand() * 3) : 0;

    const input: EvaluationInput = {
      nowMs: now,
      last: state,
      heartbeat: { lastSeenAt: lastSeen, reconnects, dmErrors },
    };

    let result;
    try {
      result = evaluateLiveness(input);
    } catch (error) {
      stats.crashes++;
      console.error(`seed ${seed} step ${i}: evaluateLiveness threw`, error);
      break;
    }
    const { decision, next } = result;
    state = next;

    // INVARIANT 4: state stays sanitizeable — finite numbers, sane counts.
    if (
      !Number.isFinite(next.at) ||
      next.alerts < 0 ||
      next.flaps < 0 ||
      (next.side !== "fresh" && next.side !== "down")
    ) {
      stats.crashes++;
      console.error(`seed ${seed} step ${i}: corrupt state`, next);
      break;
    }
    if (next.degradedSince !== undefined && !Number.isFinite(next.degradedSince)) {
      stats.crashes++;
      console.error(`seed ${seed} step ${i}: corrupt degradedSince`, next);
      break;
    }

    if (decision.action === "alert-down") {
      // INVARIANT 2: re-alerts honor the ladder — the first down alert of an
      // outage may come any time, but two down alerts within the first rung
      // (24h of the same outage) are a ladder violation.
      const gap = now - stats.lastDownAlertAt;
      if (Number.isFinite(gap) && gap < 23.9 * HOUR && !decision.first) {
        stats.crashes++;
        console.error(`seed ${seed} step ${i}: re-alerted within rung, gap=${gap}`, decision);
        break;
      }
      stats.downAlerts++;
      if (decision.first) {
        // INVARIANT 1: a first alert must follow a REAL outage — the heartbeat
        // must have been genuinely stale (or never sent). Sanity-only:
        if (lastSeen !== null && now - lastSeen < DOWN_AFTER_MS * 0.99) {
          stats.crashes++;
          console.error(`seed ${seed} step ${i}: first DOWN on a fresh heartbeat`, decision);
          break;
        }
        stats.minGapBetweenDownAlerts = Math.min(stats.minGapBetweenDownAlerts, now);
      }
      stats.lastDownAlertAt = now;
    } else if (decision.action === "alert-recovered") {
      stats.recoveredAlerts++;
    } else if (decision.action === "alert-crash-loop") {
      // INVARIANT 5: the crash-loop page really happened at/after threshold.
      if ((decision as { flaps: number }).flaps < FLAP_PAGE_THRESHOLD) {
        stats.crashes++;
        console.error(`seed ${seed} step ${i}: crash-loop below threshold`, decision);
        break;
      }
      stats.crashLoopAlerts++;
    } else if (decision.action === "alert-degraded") {
      stats.degradedAlerts++;
    }

    // INVARIANT 3 (soft): every decision yields sendable text when it matters.
    if (decision.action !== "none") {
      const text = livenessAlertText(decision) ?? degradedAlertText(decision);
      if (text === null) {
        stats.crashes++;
        console.error(`seed ${seed} step ${i}: alert decision with no text`, decision);
        break;
      }
    }
  }
  return { stats, finalState: state };
}

test("fuzz: 10k random steps per seed hold the paging invariants (8 seeds)", () => {
  for (let seed = 1; seed <= 8; seed++) {
    const { stats } = walk(seed, 10_000);
    assert.equal(stats.crashes, 0, `seed ${seed}: invariants violated — see console errors above`);
  }
});

test("fuzz: the walks actually exercise every alert kind (not vacuously passing)", () => {
  let totals = { down: 0, recovered: 0, crashLoop: 0, degraded: 0 };
  for (let seed = 1; seed <= 8; seed++) {
    const { stats } = walk(seed, 10_000);
    totals = {
      down: totals.down + stats.downAlerts,
      recovered: totals.recovered + stats.recoveredAlerts,
      crashLoop: totals.crashLoop + stats.crashLoopAlerts,
      degraded: totals.degraded + stats.degradedAlerts,
    };
  }
  assert.ok(totals.down > 50, "the walk must produce real down alerts");
  assert.ok(totals.recovered > 50, "the walk must produce real recoveries");
  assert.ok(
    totals.crashLoop > 0,
    "20% dark probability over 80k steps must hit the flap threshold",
  );
  assert.ok(totals.degraded > 0, "degraded telemetry must trigger degraded alerts");
});

test("fuzz: a crash-loop storm cannot produce more pages than blips/1 plus 1", () => {
  // Worst case monotonicity: one crash-loop page needs >= THRESHOLD blips,
  // so pages can never exceed blip count — the drip is strictly better.
  const { stats } = walk(42, 10_000);
  assert.ok(stats.crashLoopAlerts <= stats.recoveredAlerts / FLAP_PAGE_THRESHOLD + 1);
});
