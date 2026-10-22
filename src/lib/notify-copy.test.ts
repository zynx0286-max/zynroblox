// Tests for the maintenance panel's test-send copy.
//
// This text is the only thing telling the owner WHY a test DM didn't arrive, so
// each transport reason must map to a concrete next step — and a missing reason
// must say so instead of rendering "not sent: undefined".

import { test } from "node:test";
import assert from "node:assert/strict";

import { describeTestReason, lastTestLine, retryTestLabel, testReasonFix } from "./notify-copy.ts";

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

test("muted and unregistered are distinct, because the fixes differ", () => {
  assert.match(describeTestReason("muted"), /muted/);
  assert.match(describeTestReason("no owner registered"), /DM the bot once/);
  assert.notEqual(describeTestReason("muted"), describeTestReason("no owner registered"));
});

test("a reason with a known fix links straight to the instructions", () => {
  assert.equal(testReasonFix("not configured")?.label, "Set up the bot token");
  assert.equal(testReasonFix("muted")?.label, "How to unmute");
  assert.equal(testReasonFix("no owner registered")?.label, "Register your Discord id");
  assert.equal(testReasonFix("no DM channel with the bot yet")?.label, "Open the bot DM steps");
  assert.equal(testReasonFix("discord error")?.label, "Discord troubleshooting");
  assert.equal(testReasonFix("not configured")?.href.endsWith("#one-time-setup-5-minutes"), true);
  assert.equal(testReasonFix("no owner registered")?.href.includes("discord-bot.md"), true);
  assert.equal(
    testReasonFix("no DM channel with the bot yet")?.href.includes("discord-bot.md"),
    true,
  );
  assert.equal(testReasonFix("discord error")?.href.endsWith("#troubleshooting"), true);
  assert.equal(testReasonFix("muted")?.href.endsWith("maintenance.md#notifications"), true);
  for (const reason of ["not configured", "muted", "discord error"]) {
    assert.equal(testReasonFix(reason)?.href.startsWith("https://github.com/"), true);
  }
});

test("a legacy combined reason still gets a useful link", () => {
  assert.equal(
    testReasonFix("muted or no owner registered")?.href.endsWith("#one-time-setup-5-minutes"),
    true,
  );
});

test("an unknown or missing reason has no link rather than a wrong one", () => {
  assert.equal(testReasonFix("rate limited by discord"), null);
  assert.equal(testReasonFix(undefined), null);
});

test("a delivered test reads as delivered, with the relative time", () => {
  assert.equal(
    lastTestLine({ at: minutesAgo(4), sent: true }, NOW),
    "Last test 4 minutes ago — delivered to your DMs.",
  );
});

test("the retry label counts down instead of sitting silently disabled", () => {
  assert.equal(retryTestLabel(false, 18), "Retry in 18s");
  assert.equal(retryTestLabel(false, 0), "Retry test DM");
  assert.equal(retryTestLabel(false, -3), "Retry test DM");
});

test("an in-flight retry is acknowledged even while the cooldown runs", () => {
  assert.equal(retryTestLabel(true, 18), "Retrying…");
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
