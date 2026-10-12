// Re-checks portfolio entries against Roblox's public APIs.
//
// Two jobs share this module: a nightly Cloudflare cron task and the admin
// panel's "refresh" button, so both behave identically and neither can drift.
//
// SAFETY MODEL — this runs unattended, so it must never destroy curated work.
// An entry's title/description/image may have been hand-written in the admin
// panel (or come from src/data/works.ts), and Roblox's own name is often a
// worse version of it: the catalog ships "Engineria: Project X" while Roblox
// reports "Engineria Project X". Blindly syncing would rename the portfolio to
// match a game's own title screen. So the rules are:
//
//   filled  — the stored field is EMPTY or a placeholder → safe to fill in.
//   renames — the field has real curated content that differs from Roblox's
//             → REPORTED for review, never applied automatically.
//   local   — a curated /assets/… image → never replaced by a CDN thumbnail.
//
// Only `filled` is applied. Everything else is surfaced so a human decides.

// Relative (not "@/lib/…") so the bare Node test runner can import this module
// directly — it has no tsconfig-paths resolution, and these rules are unit-tested.
import { isLocalAsset, isPlaceholderTitle } from "./store-cas.ts";

/** Metadata we care about from Roblox, per place id. */
export type RobloxMeta = {
  placeId: string;
  title: string;
  description: string;
  image: string | null;
  universeId: number | null;
};

/**
 * One proposed edit, with why it was (or wasn't) made. `from` is typed as a
 * string because these cross the server-function boundary (and are only ever
 * displayed), and `unknown` isn't serializable.
 */
export type RefreshChange = {
  slug: string;
  field: "title" | "description" | "image";
  from: string;
  to: string;
  reason: string;
};

/** Renders a stored field value as the text shown in a report. */
function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

export type RefreshReport = {
  /** Roblox-game entries examined. */
  checked: number;
  /** Safe fills, applied automatically. */
  filled: RefreshChange[];
  /** Curated values that differ from Roblox's — for a human to review. */
  renames: RefreshChange[];
  /** Places Roblox returned nothing usable for. */
  unavailable: Array<{ slug: string; placeId: string }>;
};

/** Roblox game links: https://www.roblox.com/games/<placeId>/<slug> */
const PLACE_RE = /roblox\.com\/games\/(\d+)/i;

/** The place id of an entry's Roblox link, or null if it isn't a Roblox game. */
export function placeIdOf(href: string | undefined): string | null {
  return String(href ?? "").match(PLACE_RE)?.[1] ?? null;
}

/** Minimal shape needed to plan a refresh; keeps this testable without the store. */
export type RefreshableWork = {
  slug: string;
  title: string;
  description?: string;
  image?: string;
  href?: string;
};

const isBlank = (value: unknown) => typeof value !== "string" || value.trim() === "";

/**
 * Decides what to do about one entry. Pure, so the nightly job and the admin
 * button provably apply the same rules — and so the rules themselves are
 * unit-testable without touching the network or the database.
 */
export function planWorkRefresh(
  work: RefreshableWork,
  meta: RobloxMeta | null,
): { filled: RefreshChange[]; renames: RefreshChange[] } {
  const filled: RefreshChange[] = [];
  const renames: RefreshChange[] = [];
  if (!meta) return { filled, renames };

  // Title: a placeholder is an empty slot; a real title is curated.
  const realTitle = meta.title.trim();
  if (realTitle) {
    if (isPlaceholderTitle(work.title)) {
      filled.push({
        slug: work.slug,
        field: "title",
        from: asText(work.title),
        to: realTitle,
        reason: "placeholder title replaced with the real game name",
      });
    } else if (work.title.trim() !== realTitle) {
      renames.push({
        slug: work.slug,
        field: "title",
        from: asText(work.title),
        to: realTitle,
        reason: "Roblox now reports a different name — left alone on purpose",
      });
    }
  }

  // Description: empty only. Curated copy is never touched.
  const realDescription = meta.description.trim();
  if (realDescription && isBlank(work.description)) {
    filled.push({
      slug: work.slug,
      field: "description",
      from: work.description ?? "",
      to: realDescription,
      reason: "description was empty",
    });
  }

  // Image: empty only, and never over a curated repo asset.
  if (meta.image && isBlank(work.image)) {
    filled.push({
      slug: work.slug,
      field: "image",
      from: work.image ?? "",
      to: meta.image,
      reason: "icon was missing",
    });
  } else if (meta.image && work.image && isLocalAsset(work.image)) {
    renames.push({
      slug: work.slug,
      field: "image",
      from: asText(work.image),
      to: meta.image,
      reason: "curated /assets image kept instead of the Roblox thumbnail",
    });
  }

  return { filled, renames };
}

/** Plans a refresh across every entry. */
export function planRefresh(
  works: RefreshableWork[],
  metaBySlug: Map<string, RobloxMeta | null>,
): RefreshReport {
  const filled: RefreshChange[] = [];
  const renames: RefreshChange[] = [];
  const unavailable: Array<{ slug: string; placeId: string }> = [];
  let checked = 0;

  for (const work of works) {
    const placeId = placeIdOf(work.href);
    if (!placeId) continue; // Discord servers and non-Roblox links
    checked++;
    const meta = metaBySlug.get(work.slug) ?? null;
    if (!meta) {
      unavailable.push({ slug: work.slug, placeId });
      continue;
    }
    const plan = planWorkRefresh(work, meta);
    filled.push(...plan.filled);
    renames.push(...plan.renames);
  }

  return { checked, filled, renames, unavailable };
}

// ---------------------------------------------------------------------------
// Fetching (the only part that touches the network)
// ---------------------------------------------------------------------------

/** Roblox rate-limits datacenter IPs hard; give every request room to breathe. */
const REQUEST_DELAY_MS = 150;
const FETCH_TIMEOUT_MS = 8_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // timeout / network — treated as "unavailable", not fatal
  }
}

/**
 * Resolves metadata for each entry, batching the games/icons lookups into one
 * request per batch. Per-game bursts are exactly what Roblox throttles, and a
 * throttled refresh looks like "no metadata", which is how bot entries ended up
 * with placeholder titles in the first place.
 */
export async function fetchRobloxMetadata(
  works: RefreshableWork[],
  knownUniverseIds: Record<string, number> = {},
): Promise<Map<string, RobloxMeta | null>> {
  const out = new Map<string, RobloxMeta | null>();
  const games = works.filter((w) => placeIdOf(w.href));
  if (games.length === 0) return out;

  const universeByPlace = new Map<string, number>();
  for (const work of games) {
    const placeId = placeIdOf(work.href) as string;
    // Universe ids never change, so a known one saves a request.
    const known = knownUniverseIds[placeId];
    if (known) {
      universeByPlace.set(placeId, known);
      continue;
    }
    const uni = await fetchJson<{ universeId?: number }>(
      `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
    );
    if (uni?.universeId) universeByPlace.set(placeId, uni.universeId);
    await sleep(REQUEST_DELAY_MS);
  }

  const universeIds = [...new Set(universeByPlace.values())];
  // The games endpoint accepts a comma-separated list; chunk to stay well
  // inside any URL-length or batch-size limits.
  const CHUNK = 50;
  const details = new Map<
    number,
    { name?: string; description?: string; creator?: { name?: string } }
  >();
  const icons = new Map<number, string>();
  for (let i = 0; i < universeIds.length; i += CHUNK) {
    const list = universeIds.slice(i, i + CHUNK).join(",");
    const [gamesRes, iconsRes] = await Promise.all([
      fetchJson<{
        data?: Array<{
          universeId?: number;
          name?: string;
          description?: string;
          creator?: { name?: string };
        }>;
      }>(`https://games.roblox.com/v1/games?universeIds=${list}`),
      fetchJson<{ data?: Array<{ universeId?: number; imageUrl?: string }> }>(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${list}&size=512x512&format=Png&isCircular=false`,
      ),
    ]);
    for (const g of gamesRes?.data ?? []) {
      if (g.universeId) details.set(g.universeId, g);
    }
    for (const icon of iconsRes?.data ?? []) {
      if (icon.universeId && icon.imageUrl) icons.set(icon.universeId, icon.imageUrl);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  for (const work of games) {
    const placeId = placeIdOf(work.href) as string;
    const universeId = universeByPlace.get(placeId) ?? null;
    const game = universeId ? details.get(universeId) : null;
    if (!game?.name) {
      out.set(work.slug, null);
      continue;
    }
    out.set(work.slug, {
      placeId,
      title: game.name.trim(),
      description: [
        (game.description ?? "").trim(),
        game.creator?.name ? `by ${game.creator.name}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      image: universeId ? (icons.get(universeId) ?? null) : null,
      universeId,
    });
  }
  return out;
}
