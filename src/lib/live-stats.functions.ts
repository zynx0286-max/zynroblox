import { createServerFn } from "@tanstack/react-start";
import { getPublicWorks } from "@/lib/public-data";

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
const UNIVERSE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // universe ids are stable

let cache: { at: number; data: LiveGameStats | null } | null = null;
const universeCache = new Map<number, { at: number; id: number }>();
const inFlight = new Map<number, Promise<number | null>>();

async function resolveUniverse(placeId: number): Promise<number | null> {
  const hit = universeCache.get(placeId);
  if (hit && Date.now() - hit.at < UNIVERSE_TTL_MS) return hit.id;
  const pending = inFlight.get(placeId);
  if (pending) return pending;
  const run = (async () => {
    try {
      const res = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { universeId?: number };
      const id = typeof body.universeId === "number" ? body.universeId : null;
      if (id !== null) universeCache.set(placeId, { at: Date.now(), id });
      return id;
    } catch {
      return null;
    } finally {
      inFlight.delete(placeId);
    }
  })();
  inFlight.set(placeId, run);
  return run;
}

async function fetchStats(
  universeIds: number[],
): Promise<Map<number, { visits: number; playing: number }>> {
  const out = new Map<number, { visits: number; playing: number }>();
  // Roblox caps at 50 universe ids per request; chunk defensively.
  for (let i = 0; i < universeIds.length; i += 50) {
    const chunk = universeIds.slice(i, i + 50);
    try {
      const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${chunk.join(",")}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const body = (await res.json()) as {
        data?: Array<{ id?: number; visits?: number; playing?: number }>;
      };
      for (const g of body.data ?? []) {
        if (typeof g.id !== "number") continue;
        out.set(g.id, { visits: g.visits ?? 0, playing: g.playing ?? 0 });
      }
    } catch {
      // ignore — individual game failures shouldn't kill the whole batch
    }
  }
  return out;
}

export const getLiveGameStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveGameStats> => {
    // Serve cached results (even expired, while revalidating below) to stay
    // fast and resilient under spikes.
    if (cache && Date.now() - cache.at < CACHE_TTL_MS && cache.data) {
      return cache.data;
    }

    const works = await getPublicWorks();
    const byPlace = new Map<number, { slug: string; title: string }>();
    for (const w of works) {
      const m = w.href?.match(GAME_HREF_RE);
      if (!m) continue;
      const placeId = Number(m[1]);
      if (!byPlace.has(placeId)) byPlace.set(placeId, { slug: w.slug, title: w.title });
    }

    const placeIds = [...byPlace.keys()];
    const universeOf = new Map<number, number>();
    await Promise.all(
      placeIds.map(async (placeId) => {
        const universeId = await resolveUniverse(placeId);
        if (universeId !== null) universeOf.set(placeId, universeId);
      }),
    );

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
    cache = { at: Date.now(), data };
    return data;
  },
);
