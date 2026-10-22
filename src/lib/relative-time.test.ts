// Tests for the relative-time labels in the admin panel.
//
// The label sits next to "last test sent", so it has to be honest: rounding down
// is right ("59 minutes ago" is better than "an hour ago"), a future timestamp
// from clock skew must not read as a negative age, and the singular/plural must
// not flip a second early.
//
// Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { relativeTime } from "./relative-time.ts";

const NOW = 1_760_000_000_000;
const ago = (ms: number) => relativeTime(NOW - ms, NOW);

test("a send seconds old reads as just now", () => {
  assert.equal(ago(0), "just now");
  assert.equal(ago(5_000), "just now");
  assert.equal(ago(29_999), "just now");
});

test("a minute is a minute, not zero minutes", () => {
  assert.equal(ago(30_000), "1 minute ago");
  assert.equal(ago(60_000), "1 minute ago");
  assert.equal(ago(119_999), "1 minute ago");
});

test("minutes round down so the label never overstates how long ago it was", () => {
  assert.equal(ago(2 * 60_000), "2 minutes ago");
  assert.equal(ago(59 * 60_000 + 59_999), "59 minutes ago");
});

test("hours take over at 60 minutes", () => {
  assert.equal(ago(60 * 60_000), "1 hour ago");
  assert.equal(ago(3 * 3_600_000), "3 hours ago");
  assert.equal(ago(23 * 3_600_000 + 3_599_999), "23 hours ago");
});

test("days take over at 24 hours", () => {
  assert.equal(ago(24 * 3_600_000), "1 day ago");
  assert.equal(ago(5 * 86_400_000), "5 days ago");
});

test("a timestamp from the future is not a negative age", () => {
  assert.equal(relativeTime(NOW + 60_000, NOW), "just now");
});

test("a missing timestamp says so instead of inventing a time", () => {
  assert.equal(relativeTime(Number.NaN, NOW), "at an unknown time");
});
