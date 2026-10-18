// Pure-half tests for scripts/lib/supabase-aux.mjs (no network here): the
// simulation-status rules that keep a leftover "down-sim" heartbeat label
// from surviving in every report. The wire-facing half (fetch/CAS) is
// protocol-mirrored from store-cas and pinned by store-cas.test.ts instead.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HEARTBEAT_KEY,
  LIVENESS_STATE_KEY,
  isSimulationStatus,
  stripSimulationStatus,
} from "./supabase-aux.mjs";

test("aux-row keys match the store row names", () => {
  assert.equal(HEARTBEAT_KEY, "zyn-bot-heartbeat-v1");
  assert.equal(LIVENESS_STATE_KEY, "zyn-bot-liveness-v1");
});

test("real gateway statuses are never flagged as simulation residue", () => {
  // What the bot itself reports (bot/index.mjs): "ready" or the ws status numeral.
  for (const status of [undefined, null, "", "ready", "0", "2", "5"]) {
    assert.equal(isSimulationStatus(status), false, `status=${String(status)}`);
  }
  // Gateway states that happen to contain similar words don't false-positive.
  assert.equal(isSimulationStatus("resuming"), false);
});

test("any sim-marked status string is residue", () => {
  assert.equal(isSimulationStatus("down-sim"), true);
  assert.equal(isSimulationStatus("down sim"), true);
  assert.equal(isSimulationStatus("SIM"), true);
});

test("strip returns null when there is nothing to clean", () => {
  assert.equal(stripSimulationStatus(null), null);
  assert.equal(stripSimulationStatus(undefined), null);
  assert.equal(stripSimulationStatus({}), null);
  assert.equal(stripSimulationStatus({ lastSeenAt: 1, status: "ready" }), null);
  assert.equal(stripSimulationStatus({ lastSeenAt: 1 }), null);
});

test("strip removes ONLY the sim label, preserving the rest of the row", () => {
  const doc = {
    lastSeenAt: 1729,
    status: "down-sim",
    pingMs: 30,
    reconnects: 0,
    dmErrors: 0,
  };
  const clean = stripSimulationStatus(doc);
  assert.deepEqual(clean, { lastSeenAt: 1729, pingMs: 30, reconnects: 0, dmErrors: 0 });
  // The cleaned doc must be JSON-clean (the field vanishes, not `undefined`).
  assert.equal(JSON.stringify(clean).includes("status"), false);
  // Input untouched.
  assert.equal(doc.status, "down-sim");
});
