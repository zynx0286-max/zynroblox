// Turns the activity log into a human digest.
//
// Pure functions only: the weekly DM, the admin panel's activity view and the
// tests all derive from these, so what you read in Discord is exactly what the
// tests assert.

import type { ActivityEntry, ActivityKind } from "@/lib/store";

export type DigestCounts = Record<ActivityKind, number>;

export type Digest = {
  /** Inclusive start, exclusive end, as ISO strings. */
  from: string;
  to: string;
  counts: DigestCounts;
  /** New entries that are fully finished (title + icon came from Roblox). */
  completed: ActivityEntry[];
  /** New entries still needing a human: placeholders or missing details. */
  needsAttention: ActivityEntry[];
  /** Curated fields the nightly refresh deliberately did not overwrite. */
  reviewSuggested: ActivityEntry[];
  merges: ActivityEntry[];
  refreshes: ActivityEntry[];
  /** True when there is nothing at all worth sending. */
  quiet: boolean;
};

const emptyCounts = (): DigestCounts => ({
  "entry.created": 0,
  "entry.placeholder": 0,
  "entry.merged": 0,
  "refresh.ran": 0,
  system: 0,
});

/**
 * Builds the digest for the window ending at `now`.
 *
 * `days` is the window length; the weekly digest uses 7. Entries are filtered
 * by timestamp rather than by count, so a quiet week genuinely produces an
 * empty digest instead of a digest full of stale news.
 */
export function buildDigest(entries: ActivityEntry[], now: Date, days = 7): Digest {
  const end = now.getTime();
  const start = end - days * 24 * 60 * 60 * 1000;
  const counts = emptyCounts();

  const completed: ActivityEntry[] = [];
  const needsAttention: ActivityEntry[] = [];
  const reviewSuggested: ActivityEntry[] = [];
  const merges: ActivityEntry[] = [];
  const refreshes: ActivityEntry[] = [];

  for (const entry of entries) {
    const at = Date.parse(entry.at);
    // An unparseable timestamp is skipped rather than guessed at — better to
    // under-report than to claim something happened at a made-up time.
    if (Number.isNaN(at) || at < start || at >= end) continue;

    counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;

    if (entry.kind === "entry.created") completed.push(entry);
    else if (entry.kind === "entry.placeholder") needsAttention.push(entry);
    else if (entry.kind === "entry.merged") merges.push(entry);
    else if (entry.kind === "refresh.ran") refreshes.push(entry);

    // A refresh that found curated values differing from Roblox's is asking
    // for a human decision, so it belongs in the "needs attention" bucket too.
    const review = Number(entry.detail?.["review"] ?? 0);
    if (entry.kind === "refresh.ran" && review > 0) {
      reviewSuggested.push({ ...entry, summary: `${review} field(s) Roblox disagrees with` });
    }
  }

  const quiet =
    completed.length === 0 &&
    needsAttention.length === 0 &&
    merges.length === 0 &&
    refreshes.length === 0;

  return {
    from: new Date(start).toISOString(),
    to: new Date(end).toISOString(),
    counts,
    completed,
    needsAttention,
    reviewSuggested,
    merges,
    refreshes,
    quiet,
  };
}

/** Discord embeds cap at 25 fields and titles at 256 chars. */
const MAX_LISTED = 8;

/** "a, b and c" — for compact embed fields. */
export function joinNames(names: string[], max = MAX_LISTED): string {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  if (shown.length === 0) return "";
  if (shown.length === 1) return extra > 0 ? `${shown[0]} (+${extra} more)` : shown[0]!;
  return (
    `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` +
    (extra > 0 ? ` (+${extra} more)` : "")
  );
}

/** The headline for a digest — what the DM opens with. */
export function digestHeadline(digest: Digest): string {
  if (digest.quiet) return "📭 Nothing happened this week";
  const added = digest.completed.length + digest.needsAttention.length;
  if (added === 0) return "🔧 Portfolio maintenance";
  return added === 1 ? "➕ 1 new entry this week" : `➕ ${added} new entries this week`;
}
