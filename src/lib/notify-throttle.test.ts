// Tests for the cooldown on the admin's "send test DM" button.
//
// The failure worth guarding against is not spam the owner typed on purpose — it
// is a double click, or a stuck retry, landing three DMs in Discord's channel and
// burning its rate limit. So the boundary matters: allowed again at exactly the
// cooldown, never before, and never unlocked by a clock that jumped backwards.
//
// Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TEST_DIGEST_COOLDOWN_MS,
  cooldownRemainingMs,
  cooldownSeconds,
} from "./notify-throttle.ts";

const NOW = 1_760_000_000_000;

test("a test DM that was never sent is allowed immediately", () => {
  assert.equal(cooldownRemainingMs(NOW, 0), 0);
  assert.equal(cooldownRemainingMs(NOW, Number.NaN), 0);
});

test("a just-sent DM is locked for the whole cooldown", () => {
  assert.equal(cooldownRemainingMs(NOW, NOW), TEST_DIGEST_COOLDOWN_MS);
});

test("the wait is what is left, not the whole window", () => {
  assert.equal(cooldownRemainingMs(NOW, NOW - 10_000), TEST_DIGEST_COOLDOWN_MS - 10_000);
});

test("the cooldown opens again exactly at the boundary, not a millisecond before", () => {
  assert.equal(cooldownRemainingMs(NOW, NOW - TEST_DIGEST_COOLDOWN_MS + 1), 1);
  assert.equal(cooldownRemainingMs(NOW, NOW - TEST_DIGEST_COOLDOWN_MS), 0);
  assert.equal(cooldownRemainingMs(NOW, NOW - TEST_DIGEST_COOLDOWN_MS * 5), 0);
});

test("a timestamp in the future does not unlock the button", () => {
  assert.equal(
    cooldownRemainingMs(NOW, NOW + 60_000),
    TEST_DIGEST_COOLDOWN_MS,
    "a clock that moved backwards must not be treated as elapsed time",
  );
});

test("a broken clock on the server fails closed, not open", () => {
  assert.equal(cooldownRemainingMs(Number.NaN, NOW), TEST_DIGEST_COOLDOWN_MS);
});

test("disabling the cooldown is explicit and total", () => {
  assert.equal(cooldownRemainingMs(NOW, NOW, 0), 0);
  assert.equal(cooldownRemainingMs(NOW, NOW, -1), 0);
});

test("seconds round up so a visible countdown never promises 0s too early", () => {
  assert.equal(cooldownSeconds(0), 0);
  assert.equal(cooldownSeconds(-5), 0);
  assert.equal(cooldownSeconds(1), 1);
  assert.equal(cooldownSeconds(999), 1);
  assert.equal(cooldownSeconds(1000), 1);
  assert.equal(cooldownSeconds(1001), 2);
  assert.equal(cooldownSeconds(TEST_DIGEST_COOLDOWN_MS), 30);
});
