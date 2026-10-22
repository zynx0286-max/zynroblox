// Tests for the maintenance panel's test-send copy.
//
// This text is the only thing telling the owner WHY a test DM didn't arrive, so
// each transport reason must map to a concrete next step — and a missing reason
// must say so instead of rendering "not sent: undefined".

import { test } from "node:test";
import assert from "node:assert/strict";

import { describeTestReason, lastTestLine } from "./notify-copy.ts";

const NOW = 1_760_000_000_000;
const minutesAgo = (minutes: number) => NOW - minutes * 60_000;
const hoursAgo = (hours: number) => NOW - hours * 3_600_000;

test("every known transport reason names something the owner can fix", () => {
  assert.match(describeTestReason("not configured"), /DISCORD_BOT_TOKEN/);
  assert.match(describeTestReason("muted or no owner registered"), /DM the bot once/);
  assert.match(describeTestReason("no DM channel with the bot yet"), /message it once/);
  assert.match(describeTestReason("discord error"), /check the bot token/);
});

test("an unknown reason is shown, not hidden", () => {
  assert.equal(describeTestReason("rate limited by discord"), "rate limited by discord");
});

test("a delivered test reads as delivered, with the relative time", () => {
  assert.equal(
    lastTestLine({ at: minutesAgo(4), sent: true }, NOW),
    "Last test 4 minutes ago — delivered to your DMs.",
  );
});

test("a just-sent test doesn't claim to be minutes old", () => {
  assert.equal(
    lastTestLine({ at: NOW - 2_000, sent: true }, NOW),
    "Last test just now — delivered to your DMs.",
  );
});

test("a failed test includes the reason, not just the verdict", () => {
  assert.equal(
    lastTestLine({ at: minutesAgo(2), sent: false, reason: "not configured" }, NOW),
    "Last test 2 minutes ago — not sent: no Discord bot token is configured (set DISCORD_BOT_TOKEN first).",
  );
});

test("a failure with no recorded reason says that instead of inventing one", () => {
  assert.equal(
    lastTestLine({ at: hoursAgo(3), sent: false }, NOW),
    "Last test 3 hours ago — not sent: no reason was recorded.",
  );
});

test("an unparseable timestamp doesn't print NaN minutes", () => {
  assert.equal(
    lastTestLine({ at: Number.NaN, sent: true }, NOW),
    "Last test at an unknown time — delivered to your DMs.",
  );
});
