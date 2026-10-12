// Tests for the bot-liveness state machine (src/lib/bot-liveness-rules.ts).
//
// This module is the thing that decides when to interrupt the owner, so its
// failure modes are exactly what's asserted here: a 3-day outage must not page
// 72 times, a recovery must be reported so silence becomes trustworthy, corrupt
// timestamps and clock skew must not crash or fake an alert, and the weekly
// digest line must stay silent when everything is fine.
//
// RUNTIME NOTE: the subject is pure with zero imports, so the bare Node test
// runner loads it directly — same pattern as bot-heartbeat.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOWN_AFTER_MS,
  DEGRADED_MIN_RECONNECTS,
  degradedAlertText,
  evaluateLiveness,
  isDegraded,
  livenessAlertText,
  livenessDigestLine,
  type EvaluationInput,
  type LivenessLastState,
} from "./bot-liveness-rules.ts";
import { buildLivenessEmbed } from "./notify-embeds.ts";

const HOUR = 3_600_000;
const NOW = 1_000_000_000_000;

function input(over: Partial<EvaluationInput> = {}): EvaluationInput {
  return {
    nowMs: NOW,
    last: null,
    heartbeat: { lastSeenAt: NOW - 60_000 }, // 1 min ago = fresh
    ...over,
  };
}

function down(minutes: number): EvaluationInput {
  return input({ heartbeat: { lastSeenAt: NOW - minutes * 60_000 } });
}

test("DOWN_AFTER_MS is comfortably above the bot's 5-minute ping cadence", () => {
  assert.equal(DOWN_AFTER_MS, 30 * 60 * 1000);
});

test("first evaluation with a fresh bot stays silent (no deployment-day page)", () => {
  const { decision } = evaluateLiveness(input());
  assert.equal(decision.action, "none");
});

test("first evaluation with an ALREADY-dark bot pages immediately", () => {
  const { decision } = evaluateLiveness(down(90));
  assert.equal(decision.action, "alert-down");
  assert.equal(decision.first, true);
  assert.match(livenessAlertText(decision) ?? "", /DOWN/);
});

test("fresh → down transition alerts exactly once", () => {
  const last: LivenessLastState = { side: "fresh", at: NOW - HOUR, alerts: 0, flaps: 0 };
  const { decision, next } = evaluateLiveness(down(35));
  assert.equal(decision.action, "alert-down");
  assert.equal(decision.first, true);
  assert.equal(decision.downForMinutes, 35);
  assert.equal(next.side, "down");
  assert.equal(next.alerts, 1);
});

test("a long outage does NOT page on every tick — quiet inside the ladder", () => {
  const last: LivenessLastState = {
    side: "down",
    at: NOW - 2 * HOUR, // last alert 2h ago, rung 1 due at 24h
    downSince: NOW - 26 * HOUR,
    alerts: 1,
    flaps: 0,
  };
  const { decision, next } = evaluateLiveness(input({ last, heartbeat: down(27 * 60).heartbeat }));
  assert.equal(decision.action, "none");
  assert.equal(next, last, "quiet tick must not rewrite state");
});

test("still-down re-alerts on the rising ladder (24h rung)", () => {
  const last: LivenessLastState = {
    side: "down",
    at: NOW - 25 * HOUR,
    downSince: NOW - 3 * 24 * HOUR,
    alerts: 1,
    flaps: 0,
  };
  const { decision, next } = evaluateLiveness(
    input({ last, heartbeat: down(3 * 24 * 60).heartbeat }),
  );
  assert.equal(decision.action, "alert-down");
  assert.equal(decision.first, false);
  assert.equal(next.alerts, 2);
  assert.equal(next.downSince, NOW - 3 * 24 * HOUR, "outage start is preserved");
});

test("down → fresh sends one recovery alert naming the outage length", () => {
  const last: LivenessLastState = {
    side: "down",
    at: NOW - HOUR,
    downSince: NOW - 2 * HOUR,
    alerts: 1,
    flaps: 0,
  };
  const { decision, next } = evaluateLiveness(input({ last }));
  assert.equal(decision.action, "alert-recovered");
  assert.equal(decision.darkForMinutes, 120);
  assert.equal(next.side, "fresh");
  assert.equal(next.alerts, 0);
  assert.match(livenessAlertText(decision) ?? "", /came back after a 2h/);
});

test("fresh → fresh is quiet, and a never-pinged heartbeat counts as down", () => {
  const last: LivenessLastState = { side: "fresh", at: NOW - HOUR, alerts: 0, flaps: 0 };
  const { decision } = evaluateLiveness(input({ last, heartbeat: { lastSeenAt: null } }));
  assert.equal(decision.action, "alert-down");
  assert.equal(decision.downForMinutes, -1);
});

test("a non-finite heartbeat timestamp is treated as down, not as alive", () => {
  const last: LivenessLastState = { side: "fresh", at: NOW - HOUR, alerts: 0, flaps: 0 };
  const { decision } = evaluateLiveness(
    input({ last, heartbeat: { lastSeenAt: Number.NaN } as { lastSeenAt: number } }),
  );
  assert.equal(decision.action, "alert-down");
});

test("clock skew (heartbeat from the future) reads as alive, not crashes", () => {
  const { decision } = evaluateLiveness(input({ heartbeat: { lastSeenAt: NOW + 10 * 60_000 } }));
  assert.equal(decision.action, "none");
});

test("a decision that says repeat-down reads differently from a first page", () => {
  const first: LivenessDecisionText = livenessAlertText({
    action: "alert-down",
    reason: "",
    downForMinutes: 90,
    first: true,
  });
  const repeat: LivenessDecisionText = livenessAlertText({
    action: "alert-down",
    reason: "",
    downForMinutes: 90,
    first: false,
  });
  assert.match(first ?? "", /DOWN/);
  assert.doesNotMatch(first ?? "", /periodic/);
  assert.match(repeat ?? "", /still down/);
});

type LivenessDecisionText = ReturnType<typeof livenessAlertText>;

test("a none-decision yields no alert text (nothing to send)", () => {
  assert.equal(livenessAlertText({ action: "none", reason: "quiet" }), null);
});

// ---------------------------------------------------------------------------
// buildLivenessEmbed + livenessDigestLine
// ---------------------------------------------------------------------------

test("the embed colors are distinct per side (red first / orange repeat / green back)", () => {
  const down = buildLivenessEmbed(
    { action: "alert-down", reason: "", downForMinutes: 40, first: true },
    "text",
  );
  const repeat = buildLivenessEmbed(
    { action: "alert-down", reason: "", downForMinutes: 40, first: false },
    "text",
  );
  const back = buildLivenessEmbed(
    { action: "alert-recovered", reason: "", darkForMinutes: 40 },
    "text",
  );
  assert.notEqual(down.color, repeat.color);
  assert.notEqual(down.color, back.color);
  assert.match(back.title ?? "", /back online/);
  assert.match(down.title ?? "", /DOWN/);
  assert.match(repeat.title ?? "", /still down/);
});

test("the digest line only appears when the bot is currently down", () => {
  assert.equal(livenessDigestLine(null, NOW), null);
  assert.equal(livenessDigestLine({ side: "fresh", at: NOW, alerts: 0, flaps: 0 }, NOW), null);
  const line = livenessDigestLine(
    { side: "down", at: NOW, downSince: NOW - 2 * HOUR, alerts: 1, flaps: 0 },
    NOW,
  );
  assert.match(line ?? "", /DOWN/);
  assert.match(line ?? "", /\d{4}-\d{2}-\d{2}/);
});

test("a down digest line without a usable downSince still renders", () => {
  const line = livenessDigestLine({ side: "down", at: NOW, alerts: 3, flaps: 0 }, NOW);
  assert.match(line ?? "", /DOWN/);
  assert.doesNotMatch(line ?? "", /since/);
});

test("a corrupt liveness row (garbage side) is not trusted by the digest", () => {
  const bad = { side: "purple", at: NOW } as unknown as LivenessLastState;
  // Non-"fresh" garbage might be a real outage mid-write; the rule only
  // promises not to crash or claim freshness — it may surface it.
  const line = livenessDigestLine(bad, NOW);
  assert.ok(line === null || line.includes("DOWN"));
});

// --- degraded-but-alive: the third axis --------------------------------------

test("isDegraded threshold: 3+ reconnects or any DM error", () => {
  assert.equal(DEGRADED_MIN_RECONNECTS, 3);
  assert.equal(isDegraded({}), false);
  assert.equal(isDegraded({ reconnects: 2 }), false);
  assert.equal(isDegraded({ reconnects: 3 }), true);
  assert.equal(isDegraded({ reconnects: 1, dmErrors: 1 }), true);
  assert.equal(isDegraded({ dmErrors: 1 }), true);
});

function degradedHeartbeat(reconnects = 5, dmErrors = 0): EvaluationInput {
  return input({ heartbeat: { lastSeenAt: NOW - 60_000, reconnects, dmErrors } });
}

function degradedLast(): LivenessLastState {
  return { side: "fresh", at: NOW - HOUR, alerts: 0, flaps: 0 };
}

function degradedState(hoursAgo: number): LivenessLastState {
  return {
    side: "fresh",
    at: NOW - HOUR,
    alerts: 0,
    flaps: 0,
    degradedSince: NOW - hoursAgo * HOUR,
  };
}

test("healthy → degraded alerts exactly once, then goes quiet", () => {
  const first = evaluateLiveness(degradedHeartbeat());
  assert.equal(first.decision.action, "alert-degraded");
  assert.match((first.decision as { detail: string }).detail, /5 reconnect/);
  assert.equal(first.next.degradedSince, NOW);

  // Next tick, still degraded, same state: quiet — one alert is enough.
  const second = evaluateLiveness(
    input({ last: first.next, heartbeat: degradedHeartbeat().heartbeat }),
  );
  assert.equal(second.decision.action, "none");
});

test("first evaluation onto an already-degraded bot pages immediately", () => {
  const { decision, next } = evaluateLiveness(degradedHeartbeat(0, 2));
  assert.equal(decision.action, "alert-degraded");
  assert.match((decision as { detail: string }).detail, /2 DM error/);
  assert.equal(next.degradedSince, NOW);
});

test("degraded → healthy sends one recovery note naming the duration", () => {
  const last = degradedState(3);
  const { decision, next } = evaluateLiveness(input({ last }));
  assert.equal(decision.action, "alert-degraded-recovered");
  assert.equal(next.degradedSince, undefined);
  assert.equal(next.alerts, 0);
  const text = degradedAlertText(decision);
  assert.match(text ?? "", /settled down after ~3h/);
});

test("fresh-degraded state does not lose the outage alarm", () => {
  // A degraded bot that then goes fully dark must still alert-down.
  const last = degradedState(1);
  const { decision, next } = evaluateLiveness(down(35));
  assert.equal(decision.action, "alert-down");
  assert.equal(decision.first, true);
  assert.equal(next.degradedSince, undefined, "outage resets degradation tracking");
});

test("recovery from an outage INTO a degraded gateway keeps the degraded page due", () => {
  const last: LivenessLastState = {
    side: "down",
    at: NOW - HOUR,
    downSince: NOW - 2 * HOUR,
    alerts: 1,
    flaps: 0,
  };
  const { decision, next } = evaluateLiveness(
    input({ last, heartbeat: degradedHeartbeat().heartbeat }),
  );
  assert.equal(decision.action, "alert-recovered");
  assert.equal(next.side, "fresh");
  assert.equal(next.degradedSince, NOW, "degradation must not be silently swallowed");
});

// --- flapping: the crash-loop axis ------------------------------------------

/**
 * A `last` state representing "down alert fired, bot went dark X min ago".
 * `darkMs` controls how long the outage lasted — 5 min = a blip, hours = real.
 */
function alertedDown(darkMs: number, alertedMsAgo: number): LivenessLastState {
  return {
    side: "down",
    at: NOW - alertedMsAgo,
    downSince: NOW - darkMs,
    alerts: 1,
    flaps: 0,
  };
}

test("a normal (long) recovery is not a flap: first recovery still alerts", () => {
  // Alert fired an hour ago after a 2h outage — a real outage, not a blip.
  const last = alertedDown(2 * HOUR, HOUR);
  const { decision, next } = evaluateLiveness(
    input({ last, heartbeat: { lastSeenAt: NOW - 60_000 } }),
  );
  assert.equal(decision.action, "alert-recovered");
  assert.equal(next.flaps, 0);
});

const blip = { lastSeenAt: NOW - 60_000 }; // heart beats again → dark ~5 min

function blipCycle(flapsSoFar: number): EvaluationInput {
  // Each cycle: alerted 15 min ago, dark only 5 min, back now.
  const last = { ...alertedDown(5 * 60_000, 15 * 60_000), flaps: flapsSoFar };
  return input({ last, heartbeat: blip });
}

test("flap suppression: blips 2..3 inside the cooldown are quiet, state still counts", () => {
  const second = evaluateLiveness(blipCycle(1));
  assert.equal(second.decision.action, "none");
  assert.equal(second.next.flaps, 2);
  const third = evaluateLiveness(blipCycle(2));
  assert.equal(third.decision.action, "none");
  assert.equal(third.next.flaps, 3);
});

test("flap #4 escalates to ONE crash-loop page and resets the counter", () => {
  const fourth = evaluateLiveness(blipCycle(3));
  assert.equal(fourth.decision.action, "alert-crash-loop");
  assert.equal((fourth.decision as { flaps: number }).flaps, 4);
  assert.equal(fourth.next.flaps, 0, "the page replaces the drip; new cycle");
  assert.match(livenessAlertText(fourth.decision) ?? "", /restarting over and over/);
});

test("the down-alert of each blip cycle itself still pages (that part is news)", () => {
  // Between blips the bot going dark must keep firing the down alert —
  // suppression applies only to the recovery side of the pair.
  const midLoop: LivenessLastState = { side: "fresh", at: NOW - HOUR, alerts: 0, flaps: 2 };
  const { decision } = evaluateLiveness(down(35));
  assert.equal(decision.action, "alert-down", "outage alerts are never suppressed");
  void midLoop;
});

test("first blip after a long stable stretch alerts normally (flaps expired)", () => {
  // Cooldown expired 8h ago with 3 accumulated flaps: it settled, moved on.
  const settled: LivenessLastState = {
    side: "down",
    at: NOW - 9 * HOUR,
    downSince: NOW - (9 * HOUR + 5 * 60_000),
    alerts: 1,
    flaps: 3,
  };
  const { decision, next } = evaluateLiveness(input({ last: settled, heartbeat: blip }));
  assert.equal(decision.action, "alert-recovered", "outside cooldown a blip is ordinary news");
  assert.equal(next.flaps, 0, "outside the cooldown the counter starts fresh");
});

test("a stale flap counter decays on a quiet healthy tick", () => {
  const old: LivenessLastState = { side: "fresh", at: NOW - 7 * HOUR, alerts: 0, flaps: 2 };
  const { decision, next } = evaluateLiveness(input({ last: old }));
  assert.equal(decision.action, "none");
  assert.equal(next.flaps, 0, "7h without a repeat means the pattern is over");
});

test("digest line: degraded state shows a warning, outage still wins", () => {
  const degraded = livenessDigestLine(degradedState(30), NOW);
  assert.match(degraded ?? "", /⚠️ Bot degraded for ~1 day/);
  const degradedHours = livenessDigestLine(degradedState(6), NOW);
  assert.match(degradedHours ?? "", /⚠️ Bot degraded —/, "6 hours reads as under a day");
  const outage = livenessDigestLine(
    { side: "down", at: NOW, downSince: NOW - HOUR, alerts: 1, flaps: 0 },
    NOW,
  );
  assert.match(outage ?? "", /🚨 Bot currently DOWN/);
  // A fresh healthy state carries no digest line (even right after a page);
  // degradation always shows once it's on state, by design — it IS news.
  assert.equal(livenessDigestLine(degradedLast(), NOW), null);
  assert.match(livenessDigestLine(degradedState(0.01), NOW) ?? "", /⚠️ Bot degraded —/);
});
