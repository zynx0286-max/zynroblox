import { createServerFn } from "@tanstack/react-start";
import { getPublicWorks } from "@/lib/public-data";
import { getUniverseIds, saveUniverseIds } from "@/lib/store";

// Live Roblox game stats.
//
// Reads every work with a Roblox game link, resolves its universe id (cached
// — universe ids are stable), then batches `games.roblox.com/v1/games` to read
// current player count (`playing` = CCU) and total `visits`. Results are cached
// for a short TTL so the site never hammers the Roblox API (429 limits) while
// still showing a genuinely live count that refreshes as the page polls.
//
// All failure paths degrade gracefully: no game links, API down, rate-limited —
// the caller just shows its fallback (static) numbers.

export type LiveGame = {
  slug: string;
  title: string;
  placeId: number;
  visits: number;
  playing: number;
};

export type LiveGameStats = {
  totalVisits: number;
  totalPlaying: number;
  games: LiveGame[];
  updatedAt: string;
};

const GAME_HREF_RE = /roblox\.com\/games\/(\d+)/i;

const CACHE_TTL_MS = 60_000;

let cache: { at: number; data: LiveGameStats | null } | null = null;

// Roblox rate-limits datacenter IPs (Cloudflare Workers) hard. Firing one
// concurrent lookup per game used to get most of them 429'd on cold starts —
// and a failed lookup silently counted that game as 0 visits, collapsing the
// site-wide total. Resolution is now persisted in the store, and misses are
// resolved through a small throttled retrying queue instead.
const UNIVERSE_CONCURRENCY = 2;
const UNIVERSE_GAP_MS = 250;
const UNIVERSE_ATTEMPTS = 4;
const BATCH_ATTEMPTS = 3;
/** Hard ceiling per outbound request — a hung Roblox fetch must never pin a
 *  Worker subrequest slot indefinitely (that's what trips Cloudflare's
 *  deadlock protection when several pile up). */
const FETCH_TIMEOUT_MS = 8_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * On Workers, a Response whose body is never read or canceled stays open.
 * Enough leaked bodies trips Cloudflare's deadlock protection, which cancels
 * in-flight requests in a cascade until every fetch fails. Every code path
 * below therefore drains or cancels each response body exactly once.
 */
async function discardBody(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    // already consumed or unusable — nothing to do
  }
}

/**
 * Resolves place ids to universe ids. Persistent map first (universe ids never
 * change — a warm store needs ZERO per-place lookups), then a throttled queue
 * for new games with per-place retries (429 = exponential backoff). Unresolved
 * places are simply absent from the result; the next refresh retries them.
 */
async function resolveUniverses(placeIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  const persisted = await getUniverseIds();
  const missing: number[] = [];
  for (const placeId of placeIds) {
    const known = persisted[String(placeId)];
    if (typeof known === "number" && known > 0) out.set(placeId, known);
    else missing.push(placeId);
  }
  if (missing.length === 0) return out;

  const resolved: Record<string, number> = {};
  let index = 0;
  const worker = async () => {
    for (;;) {
      const placeId = missing[index];
      index += 1;
      if (placeId === undefined) return;
      let id: number | null = null;
      for (let attempt = 0; attempt < UNIVERSE_ATTEMPTS && id === null; attempt++) {
        if (attempt > 0) await sleep(500 * 2 ** (attempt - 1) + Math.random() * 250);
        try {
          const res = await fetch(
            `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
            {
              headers: { accept: "application/json" },
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            },
          );
          if (!res.ok) {
            console.warn(`[live-stats] universe lookup ${placeId} attempt ${attempt + 1}: HTTP ${res.status}`);
            await discardBody(res);
            continue;
          }
          let body: { universeId?: number };
          try {
            body = (await res.json()) as { universeId?: number };
          } catch (error) {
            console.warn(`[live-stats] universe lookup ${placeId}: bad JSON`, error);
            await discardBody(res);
            continue;
          }
          id = typeof body.universeId === "number" ? body.universeId : null;
        } catch (error) {
          console.warn(`[live-stats] universe lookup ${placeId} attempt ${attempt + 1} threw:`, error);
        }
      }
      if (id !== null) {
        out.set(placeId, id);
        resolved[String(placeId)] = id;
      } else {
        console.warn(`[live-stats] universe lookup FAILED permanently for place ${placeId}`);
      }
      await sleep(UNIVERSE_GAP_MS);
    }
  };
  await Promise.all(Array.from({ length: Math.min(UNIVERSE_CONCURRENCY, missing.length) }, worker));
  console.warn(
    `[live-stats] universe resolution: ${placeIds.length} places, ${missing.length} missing, ${out.size} resolved`,
  );
  // Persist so every other isolate (and every cold start) skips these lookups.
  // Best-effort: in memory-only mode the store can't persist, and stats must
  // still render rather than throw.
  try {
    await saveUniverseIds(resolved);
  } catch (error) {
    console.warn(`[live-stats] persisting universe ids failed:`, error);
    // non-persistent backend — stats still work, ids just resolve each time
  }
  return out;
}

async function fetchStats(
  universeIds: number[],
): Promise<Map<number, { visits: number; playing: number }>> {
  const out = new Map<number, { visits: number; playing: number }>();
  // Roblox caps at 50 universe ids per request; chunk defensively. A failed
  // chunk used to be skipped forever — now it retries with backoff (429s are
  // the norm from datacenter IPs), so a rate-limited refresh recovers.
  for (let i = 0; i < universeIds.length; i += 50) {
    const chunk = universeIds.slice(i, i + 50);
    for (let attempt = 0; attempt < BATCH_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(600 * 2 ** (attempt - 1) + Math.random() * 300);
      try {
        const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${chunk.join(",")}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
          console.warn(`[live-stats] batch fetch attempt ${attempt + 1}: HTTP ${res.status}`);
          await discardBody(res);
          continue;
        }
        let body: {
          data?: Array<{ id?: number; visits?: number; playing?: number }>;
        };
        try {
          body = (await res.json()) as {
            data?: Array<{ id?: number; visits?: number; playing?: number }>;
          };
        } catch (error) {
          console.warn(`[live-stats] batch fetch: bad JSON`, error);
          await discardBody(res);
          continue;
        }
        for (const g of body.data ?? []) {
          if (typeof g.id !== "number") continue;
          out.set(g.id, { visits: g.visits ?? 0, playing: g.playing ?? 0 });
        }
        console.warn(
          `[live-stats] batch chunk: HTTP ${res.status}, ${(body.data ?? []).length} rows, out=${out.size}`,
        );
        break; // chunk fetched — next chunk
      } catch (error) {
        console.warn(`[live-stats] batch fetch threw:`, error);
        // network hiccup — retry
      }
    }
  }
  return out;
}

async function computeStats(): Promise<LiveGameStats> {
  console.warn("[live-stats] compute start");
  const works = await getPublicWorks();
  const byPlace = new Map<number, { slug: string; title: string }>();
  for (const w of works) {
    const m = w.href?.match(GAME_HREF_RE);
    if (!m) continue;
    const placeId = Number(m[1]);
    if (!byPlace.has(placeId)) byPlace.set(placeId, { slug: w.slug, title: w.title });
  }

  const placeIds = [...byPlace.keys()];
  const universeOf = await resolveUniverses(placeIds);

  const stats = await fetchStats([...universeOf.values()]);

  const games: LiveGame[] = [];
  let totalVisits = 0;
  let totalPlaying = 0;
  for (const [placeId, universeId] of universeOf) {
    const meta = byPlace.get(placeId);
    const s = stats.get(universeId) ?? { visits: 0, playing: 0 };
    if (meta) {
      games.push({ slug: meta.slug, title: meta.title, placeId, ...s });
      totalVisits += s.visits;
      totalPlaying += s.playing;
    }
  }

  const data: LiveGameStats = {
    totalVisits,
    totalPlaying,
    games: games.sort((a, b) => b.visits - a.visits),
    updatedAt: new Date().toISOString(),
  };
  console.warn(
    `[live-stats] computed: games=${data.games.length} visits=${totalVisits} playing=${totalPlaying}`,
  );
  cache = { at: Date.now(), data };
  return data;
}

// Single-flight: every concurrent page render shares ONE Roblox refresh
// instead of each stacking its own fetch chain (piled-up subrequests are what
// trip Cloudflare's deadlock protection on a cold isolate).
let inFlight: Promise<LiveGameStats> | null = null;

export const getLiveGameStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveGameStats> => {
    // Serve cached results (even expired, while revalidating below) to stay
    // fast and resilient under spikes.
    if (cache && Date.now() - cache.at < CACHE_TTL_MS && cache.data) {
      return cache.data;
    }
    if (inFlight) return inFlight;
    const run = computeStats().finally(() => {
      inFlight = null;
    });
    inFlight = run;
    return run;
  },
);
