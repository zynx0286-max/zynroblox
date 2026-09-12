import type { Work } from "@/data/works";
import type { LiveGameStats } from "@/lib/live-stats.functions";

const MULTIPLIER: Record<string, number> = { k: 1_000, m: 1_000_000 };

/**
 * Extracts a numeric "reach" (visits or Discord members) from a project's
 * tags and description, e.g. "141M Visits" -> 141_000_000,
 * "9.7k Members" -> 9_700. Projects with no figure return 0.
 */
export function getReach(work: Pick<Work, "tags" | "description">): number {
  const haystack = [...(work.tags ?? []), work.description ?? ""].join(" ");
  const re = /(\d+(?:\.\d+)?)\s*([kKmM])\+?\s*(visits?|members?|subs?)?/g;
  let best = 0;
  for (const match of haystack.matchAll(re)) {
    const num = parseFloat(match[1] ?? "");
    const mult = MULTIPLIER[(match[2] ?? "").toLowerCase()] ?? 0;
    if (!Number.isFinite(num) || !mult) continue;
    best = Math.max(best, num * mult);
  }
  return best;
}

/** Sorts projects so the biggest visits/members figures come first. */
export function sortByReach<T extends Pick<Work, "tags" | "description" | "popularity" | "title">>(
  works: T[],
): T[] {
  return [...works].sort((a, b) => {
    const reach = getReach(b) - getReach(a);
    if (reach !== 0) return reach;
    const pop = (b.popularity || 0) - (a.popularity || 0);
    if (pop !== 0) return pop;
    return a.title.localeCompare(b.title);
  });
}

/** Builds a slug → live CCU (`playing`) lookup from the live game stats. */
export function ccuBySlug(stats: LiveGameStats | null | undefined): Record<string, number> {
  const map: Record<string, number> = {};
  for (const g of stats?.games ?? []) map[g.slug] = g.playing;
  return map;
}

/**
 * Sorts projects so the games with the most live players (CCU) come first.
 * Projects with no live data (non-game entries, or API unreachable) fall back
 * to visits/members order — so the list still makes sense when the Roblox API
 * is down.
 */
export function sortByCcu<
  T extends Pick<Work, "slug" | "tags" | "description" | "popularity" | "title">,
>(works: T[], ccu: Record<string, number>): T[] {
  return [...works].sort((a, b) => {
    const ca = ccu[a.slug] ?? -1;
    const cb = ccu[b.slug] ?? -1;
    if (cb !== ca) return cb - ca;
    const reach = getReach(b) - getReach(a);
    if (reach !== 0) return reach;
    const pop = (b.popularity || 0) - (a.popularity || 0);
    if (pop !== 0) return pop;
    return a.title.localeCompare(b.title);
  });
}
