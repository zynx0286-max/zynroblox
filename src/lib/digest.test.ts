// Tests for the digest that becomes the weekly Discord DM.
//
// The digest is the thing that tells the owner whether their portfolio is
// healthy, so its failure modes matter: reporting a quiet week as busy (noise
// you learn to ignore), dropping a placeholder that needs attention (an entry
// stays broken and nobody knows), or inventing activity that never happened.
//
// Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildDigest, digestHeadline, joinNames } from "./digest.ts";
import { buildDigestEmbed, buildEntryAnnouncement } from "./notify-embeds.ts";
import type { ActivityEntry, ActivityKind } from "./store.ts";

const NOW = new Date("2026-10-08T12:00:00.000Z");
const SITE = "https://roblox.zynx0286.workers.dev";
const HOUR = 3_600_000;

/** An entry `hoursAgo` hours before NOW. */
const ago = (hoursAgo: number): string =>
  new Date(NOW.getTime() - hoursAgo * 3600_000).toISOString();

function entry(over: Partial<ActivityEntry> & { kind: ActivityKind }): ActivityEntry {
  return { at: ago(1), summary: "Something", ...over };
}

test("an empty log produces a quiet digest", () => {
  const digest = buildDigest([], NOW, 7);
  assert.equal(digest.quiet, true);
  assert.equal(digest.completed.length, 0);
  assert.match(digestHeadline(digest), /Nothing happened/);
});

test("new entries are counted as completed", () => {
  const digest = buildDigest(
    [entry({ kind: "entry.created", summary: "Bat A Lucky Block" })],
    NOW,
    7,
  );
  assert.equal(digest.quiet, false);
  assert.equal(digest.completed.length, 1);
  assert.equal(digest.completed[0]?.summary, "Bat A Lucky Block");
  assert.match(digestHeadline(digest), /1 new entry/);
});

test("placeholders are separated out as needing attention", () => {
  const digest = buildDigest(
    [
      entry({ kind: "entry.created", summary: "Good Game" }),
      entry({ kind: "entry.placeholder", summary: "Roblox game 123" }),
    ],
    NOW,
    7,
  );
  assert.equal(digest.completed.length, 1);
  assert.equal(digest.needsAttention.length, 1);
  assert.match(digestHeadline(digest), /2 new entries/);
});

test("entries older than the window are excluded", () => {
  const digest = buildDigest(
    [
      entry({ kind: "entry.created", summary: "Recent", at: ago(24) }),
      entry({ kind: "entry.created", summary: "Ancient", at: ago(24 * 30) }),
    ],
    NOW,
    7,
  );
  assert.equal(digest.completed.length, 1);
  assert.equal(digest.completed[0]?.summary, "Recent", "stale news must not resurface weekly");
});

test("a refresh that disagrees with Roblox is flagged for review", () => {
  const digest = buildDigest(
    [entry({ kind: "refresh.ran", summary: "checked 29", detail: { review: 3 } })],
    NOW,
    7,
  );
  assert.equal(digest.reviewSuggested.length, 1);
  assert.match(digest.reviewSuggested[0]?.summary ?? "", /3 field/);
});

test("a refresh with no disagreements is not flagged", () => {
  const digest = buildDigest(
    [entry({ kind: "refresh.ran", summary: "checked 29", detail: { review: 0 } })],
    NOW,
    7,
  );
  assert.equal(digest.reviewSuggested.length, 0);
});

test("a refresh run alone counts as activity, not a quiet week", () => {
  const digest = buildDigest([entry({ kind: "refresh.ran", summary: "checked 29" })], NOW, 7);
  assert.equal(digest.quiet, false);
  assert.match(digestHeadline(digest), /maintenance/);
});

test("entries with unparseable timestamps are skipped, not guessed at", () => {
  const digest = buildDigest(
    [entry({ kind: "entry.created", summary: "Broken", at: "not-a-date" })],
    NOW,
    7,
  );
  assert.equal(digest.completed.length, 0);
});

test("counts cover every kind in the window", () => {
  const digest = buildDigest(
    [
      entry({ kind: "entry.created", at: ago(1) }),
      entry({ kind: "entry.placeholder", at: ago(2) }),
      entry({ kind: "entry.published", at: ago(3) }),
      entry({ kind: "entry.unpublished", at: ago(4) }),
      entry({ kind: "entry.merged", at: ago(5) }),
      entry({ kind: "refresh.ran", at: ago(6) }),
      entry({ kind: "system", at: ago(7) }),
    ],
    NOW,
    7,
  );
  assert.equal(digest.counts["entry.created"], 1);
  assert.equal(digest.counts["entry.placeholder"], 1);
  assert.equal(digest.counts["entry.published"], 1);
  assert.equal(digest.counts["entry.unpublished"], 1);
  assert.equal(digest.counts["entry.merged"], 1);
  assert.equal(digest.counts["refresh.ran"], 1);
  assert.equal(digest.counts.system, 1);
});

test("joinNames reads naturally and flags the overflow", () => {
  assert.equal(joinNames(["A"]), "A");
  assert.equal(joinNames(["A", "B"]), "A and B");
  assert.equal(joinNames(["A", "B", "C"]), "A, B and C");
  assert.equal(joinNames([]), "");
  const many = Array.from({ length: 12 }, (_, i) => `G${i}`);
  assert.match(joinNames(many), /\+4 more/);
});

test("the digest embed lists what happened and what needs a look", () => {
  const digest = buildDigest(
    [
      entry({ kind: "entry.created", summary: "Bat A Lucky Block" }),
      entry({ kind: "entry.placeholder", summary: "Roblox game 9" }),
      entry({ kind: "refresh.ran", summary: "checked 29 · filled 1", detail: { review: 2 } }),
    ],
    NOW,
    7,
  );
  const embed = buildDigestEmbed(digest, SITE);
  const names = (embed.fields ?? []).map((f) => f.name);
  assert.ok(names.includes("New entries"));
  assert.ok(names.includes("⚠️ Needs a look"), "a broken entry must be visible");
  assert.ok(names.some((n) => n.includes("Nightly Roblox refresh")));
  assert.ok(
    names.some((n) => n.includes("different name")),
    "Roblox disagreements surfaced",
  );
  assert.equal(embed.title, digestHeadline(digest));
});

test("a quiet digest embed has no empty fields", () => {
  const embed = buildDigestEmbed(buildDigest([], NOW, 7), SITE);
  assert.deepEqual(embed.fields, []);
  assert.match(embed.title ?? "", /Nothing happened/);
});

test("the embed stays inside Discord's field limit", () => {
  // One field per bucket, so it can't grow with activity — but assert it.
  const digest = buildDigest(
    [
      entry({ kind: "entry.created", summary: "A" }),
      entry({ kind: "entry.placeholder", summary: "B" }),
      entry({ kind: "entry.merged", summary: "C" }),
      entry({ kind: "refresh.ran", summary: "D", detail: { review: 1 } }),
    ],
    NOW,
    7,
  );
  const embed = buildDigestEmbed(digest, SITE);
  assert.ok((embed.fields ?? []).length <= 25, "Discord rejects more than 25 fields");
});

test("the announcement card links straight to the new entry", () => {
  const embed = buildEntryAnnouncement(
    entry({ kind: "entry.created", summary: "Bat A Lucky Block", slug: "bat-a-lucky-block" }),
    SITE,
  );
  assert.match(embed.title ?? "", /Bat A Lucky Block/);
  assert.equal(embed.fields?.[0]?.value, `${SITE}/work/bat-a-lucky-block`);
});

test("a placeholder announcement says so instead of celebrating", () => {
  const embed = buildEntryAnnouncement(
    entry({ kind: "entry.placeholder", summary: "Roblox game 9", slug: "roblox-game-9" }),
    SITE,
  );
  assert.match(embed.title ?? "", /placeholder/i);
  assert.notEqual(embed.title ?? "", (embed.description ?? "") + "ok");
  assert.match(embed.description ?? "", /needs its real title/i);
});

test("an entry with no slug still produces a usable card", () => {
  const embed = buildEntryAnnouncement(entry({ kind: "entry.created", summary: "Manual" }), SITE);
  assert.deepEqual(embed.fields, []);
  assert.ok(embed.title);
});

// --- liveness / health lines in the digest embed ----------------------------

import { buildDigestEmbed as buildDigestEmbedWithLiveness } from "./notify-embeds.ts";

const LIVENESS_NOW = NOW.getTime();

test("a DOWN liveness state adds the Bot liveness field", () => {
  const embed = buildDigestEmbedWithLiveness(buildDigest([], NOW, 7), SITE, {
    state: {
      side: "down",
      at: LIVENESS_NOW,
      downSince: LIVENESS_NOW - 48 * HOUR,
      alerts: 2,
      flaps: 0,
    },
    nowMs: LIVENESS_NOW,
  });
  const field = (embed.fields ?? []).find((f) => f.name === "🤖 Bot liveness");
  assert.ok(field, "the down state must surface in the digest");
  assert.match(field.value, /DOWN/);
});

test("a fresh state adds the Bot health field from the heartbeat", () => {
  const embed = buildDigestEmbedWithLiveness(buildDigest([], NOW, 7), SITE, {
    state: { side: "fresh", at: LIVENESS_NOW, alerts: 0, flaps: 0 },
    heartbeat: { lastSeenAt: LIVENESS_NOW - 60_000, status: "ready", pingMs: 42 },
    nowMs: LIVENESS_NOW,
  });
  const field = (embed.fields ?? []).find((f) => f.name === "🤖 Bot health");
  assert.ok(field, "a healthy heartbeat should still be worth showing");
  assert.match(field.value, /gateway ready/);
  assert.match(field.value, /ping 42ms/);
});

test("no liveness info (or a legacy heartbeat with no telemetry) adds no field", () => {
  const plain = buildDigestEmbedWithLiveness(buildDigest([], NOW, 7), SITE, {
    state: null,
    nowMs: LIVENESS_NOW,
  });
  assert.equal(
    (plain.fields ?? []).find((f) => f.name.startsWith("🤖")),
    undefined,
  );
  const legacy = buildDigestEmbedWithLiveness(buildDigest([], NOW, 7), SITE, {
    state: { side: "fresh", at: LIVENESS_NOW, alerts: 0, flaps: 0 },
    heartbeat: { lastSeenAt: LIVENESS_NOW - 60_000 }, // no status/telemetry
    nowMs: LIVENESS_NOW,
  });
  assert.equal(
    (legacy.fields ?? []).find((f) => f.name.startsWith("🤖")),
    undefined,
  );
});
test("a down state wins over the heartbeat-health display", () => {
  const embed = buildDigestEmbedWithLiveness(buildDigest([], NOW, 7), SITE, {
    state: {
      side: "down",
      at: LIVENESS_NOW,
      downSince: LIVENESS_NOW - HOUR,
      alerts: 1,
      flaps: 0,
    },
    heartbeat: { lastSeenAt: LIVENESS_NOW - 60_000, status: "ready", pingMs: 42 },
    nowMs: LIVENESS_NOW,
  });
  const names = (embed.fields ?? []).map((f) => f.name);
  assert.ok(names.includes("🤖 Bot liveness"), "down state wins");
  assert.ok(!names.includes("🤖 Bot health"), "no contradictory health line next to a DOWN one");
});
