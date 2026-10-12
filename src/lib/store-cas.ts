// Optimistic-locking core for the single-document store.
//
// WHY THIS FILE EXISTS SEPARATELY FROM store.ts
// store.ts imports the static work catalog, which imports ~40 PNG assets, so
// no plain Node test runner can load it. The concurrency rules below are the
// part that MUST be provably correct — they are what stops one Worker isolate
// from silently reverting another isolate's edit — so they live here in a
// dependency-free module the tests can import directly. store.ts supplies the
// I/O (Supabase fetch, in-memory cache) and delegates the decisions here.
//
// HOW THE LOCKING WORKS
// The store is one JSON document, so every write replaces the whole row. The
// version lives INSIDE that document (top-level `version` field), not in a
// separate column, so concurrency control needs no schema change. A writer
// reads the document, then patches it with a filter matching only the version
// it read: `?key=eq.<key>&value->>version=eq.<expected>` with a body of
// `{ ...store, version: expected + 1 }`.
//
// If another writer committed in between, the filter matches zero rows and
// PostgREST returns an empty array — a conflict. The loser re-reads the
// winner's document and RE-APPLIES its own mutation on top, so concurrent
// writers merge instead of clobbering.
//
// The two rules that keep this airtight:
//   1. Never write unconditionally when the snapshot's version is unknown. An
//      unversioned write is exactly how stale data overwrites fresh data.
//   2. Never pair a snapshot with a version from a different read. A snapshot
//      and its version must always come from the same fetch.

/** A stored document plus the version it was read at (null = unversioned row). */
export type StoreRow<T> = { store: T; version: number | null };

/** Result of a compare-and-swap attempt. */
export type CasResult =
  { status: "ok"; version: number } | { status: "conflict" } | { status: "failed" };

/**
 * Splits the embedded version off a stored document.
 * Returns null for anything that isn't an object (a missing/empty row), so
 * callers can treat "no document" uniformly. The input is never mutated.
 */
export function splitVersion<T extends object>(value: unknown): StoreRow<T> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const doc = value as Record<string, unknown>;
  const raw = doc["version"];
  const version = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  if (!("version" in doc)) return { store: doc as T, version: null };
  // Clone before deleting so the caller's parsed JSON is left untouched.
  const clone = { ...doc };
  delete clone["version"];
  return { store: clone as T, version };
}

/** The version a write should stamp, given what the writer read. */
export function nextVersion(expected: number | null): number {
  return expected === null ? 1 : expected + 1;
}

/** The PostgREST filter that makes a write conditional on the version read. */
export function buildCasVersionFilter(expected: number): string {
  return `&value->>version=eq.${expected}`;
}

/**
 * Just the path portion of the conditional PATCH, for callers that prepend
 * their own base URL (store.ts's supabaseFetch does exactly that).
 */
export function buildCasPath(key: string, expected: number): string {
  return `/rest/v1/supabase_kv?key=eq.${encodeURIComponent(key)}${buildCasVersionFilter(expected)}`;
}

/** Full conditional-PATCH URL, for callers that need an absolute URL. */
export function buildCasUrl(base: string, key: string, expected: number): string {
  return `${base.replace(/\/+$/, "")}${buildCasPath(key, expected)}`;
}

/** Body for a conditional PATCH: the new document with its version bumped. */
export function buildCasBody<T extends object>(store: T, expected: number | null): string {
  return JSON.stringify({ value: { ...store, version: nextVersion(expected) } });
}

/** Body for the unconditional bootstrap upsert (no filter, stamps version 1). */
export function buildBootstrapBody<T extends object>(key: string, store: T): string {
  return JSON.stringify({ key, value: { ...store, version: nextVersion(null) } });
}

/**
 * Interprets a conditional PATCH response. An empty array is the conflict
 * signal: the version filter matched nothing, so somebody else wrote between
 * our read and our write. `version` is filled in by the caller, which knows
 * what it expected.
 */
export function interpretCasResponse(
  ok: boolean,
  rows: unknown,
  expected: number | null,
): CasResult {
  if (!ok) return { status: "failed" };
  const matched = Array.isArray(rows) ? rows.length > 0 : false;
  return matched ? { status: "ok", version: nextVersion(expected) } : { status: "conflict" };
}

/**
 * True when a snapshot cannot be CAS'd at all because its row was never
 * versioned — the one case that requires an unconditional bootstrap write.
 */
export function shouldBootstrap(expected: number | null): boolean {
  return expected === null;
}

// ---------------------------------------------------------------------------
// Richest-value merging (used by the duplicate-merge tool)
// ---------------------------------------------------------------------------

/** True for titles the bot invents when Roblox metadata is unavailable. */
export function isPlaceholderTitle(title: unknown): boolean {
  return typeof title === "string" && /^Roblox game \d+$/.test(title.trim());
}

/** True for image paths shipped in the repo rather than fetched from Roblox. */
export function isLocalAsset(image: unknown): boolean {
  return typeof image === "string" && image.trim().startsWith("/assets/");
}

/** Non-empty strings win over empty ones; a real title beats a placeholder. */
export function pickText(a: unknown, b: unknown): string {
  const first = typeof a === "string" ? a.trim() : "";
  const second = typeof b === "string" ? b.trim() : "";
  if (!second) return first;
  if (!first) return second;
  if (isPlaceholderTitle(first) && !isPlaceholderTitle(second)) return second;
  if (isPlaceholderTitle(second) && !isPlaceholderTitle(first)) return first;
  // Both real: the more descriptive one usually wins.
  return second.length > first.length ? second : first;
}

/** Longer descriptions carry more information. */
export function pickDescription(a: unknown, b: unknown): string {
  const first = typeof a === "string" ? a.trim() : "";
  const second = typeof b === "string" ? b.trim() : "";
  return second.length > first.length ? second : first;
}

/** Repo assets win over CDN ones: they are deliberate, curated artwork. */
export function pickImage(a: unknown, b: unknown): string | undefined {
  const first = typeof a === "string" && a.trim() ? a.trim() : undefined;
  const second = typeof b === "string" && b.trim() ? b.trim() : undefined;
  if (!second) return first;
  if (!first) return second;
  if (isLocalAsset(second) && !isLocalAsset(first)) return second;
  if (isLocalAsset(first) && !isLocalAsset(second)) return first;
  return first;
}

/** Union of tags, order-preserving and de-duplicated (case-insensitive). */
export function pickTags(a: unknown, b: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of [a, b]) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (typeof raw !== "string") continue;
      const tag = raw.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}

/** `featured` is sticky: if either copy was featured, the survivor is. */
export function pickFlag(a: unknown, b: unknown): boolean {
  return a === true || b === true;
}

/** The more popular entry wins, ignoring missing/NaN values. */
export function pickNumber(a: unknown, b: unknown): number | undefined {
  const first = typeof a === "number" && Number.isFinite(a) ? a : undefined;
  const second = typeof b === "number" && Number.isFinite(b) ? b : undefined;
  if (first === undefined) return second;
  if (second === undefined) return first;
  return Math.max(first, second);
}

/** Earliest sort order keeps the entry's original position in the grid. */
export function pickSortOrder(a: unknown, b: unknown): number {
  const first = typeof a === "number" && Number.isFinite(a) ? a : Number.MAX_SAFE_INTEGER;
  const second = typeof b === "number" && Number.isFinite(b) ? b : Number.MAX_SAFE_INTEGER;
  return Math.min(first, second);
}

/**
 * Folds `drop` into `keep`, field by field, keeping the richest value.
 * The survivor keeps its own slug and id so existing links and admin edits
 * survive; only genuinely additive data (tags, featured, popularity) combines.
 */
export function mergeWorks<T extends Record<string, unknown>>(keep: T, drop: T): T {
  const merged: Record<string, unknown> = { ...keep };
  const set = (key: string, value: unknown) => {
    if (value === undefined) return;
    merged[key] = value;
  };
  // Text-ish fields: only materialize a value when at least one side had one,
  // so a merge never fills in fields neither entry ever carried.
  const setText = (key: string, value: string) => {
    if (value === "") return;
    merged[key] = value;
  };
  setText("title", pickText(keep["title"], drop["title"]));
  setText("description", pickDescription(keep["description"], drop["description"]));
  set("image", pickImage(keep["image"], drop["image"]));
  setText("role", pickText(keep["role"], drop["role"]));
  setText("category", pickText(keep["category"], drop["category"]));
  setText("href", pickText(keep["href"], drop["href"]));
  setText("linkLabel", pickText(keep["linkLabel"], drop["linkLabel"]));
  // Tags are a union, so an empty result means neither side had any — leaving
  // the survivor's original array untouched is the same thing.
  const tags = pickTags(keep["tags"], drop["tags"]);
  if (tags.length > 0) set("tags", tags);
  // Booleans/numbers: only set when at least one side carried a real value.
  if (keep["featured"] === true || drop["featured"] === true) set("featured", true);
  set("popularity", pickNumber(keep["popularity"], drop["popularity"]));
  if (typeof keep["sortOrder"] === "number" || typeof drop["sortOrder"] === "number") {
    set("sortOrder", pickSortOrder(keep["sortOrder"], drop["sortOrder"]));
  }
  return merged as T;
}

/** One field's before/after in a merge dry-run. */
export type FieldDiff = { field: string; kept: unknown; dropped: unknown };

/**
 * Fields the merge would change ON THE SURVIVOR, for a dry-run diff. This is
 * what the user needs to see: which fields of the entry being kept are about to
 * be updated. Identity fields (slug, id) are never reported — the survivor
 * keeps them so existing links stay valid.
 */
export function diffWorks(
  keep: Record<string, unknown>,
  drop: Record<string, unknown>,
): FieldDiff[] {
  const merged = mergeWorks(keep, drop) as Record<string, unknown>;
  const out: FieldDiff[] = [];
  for (const key of new Set([...Object.keys(keep), ...Object.keys(merged)])) {
    if (key === "slug" || key === "id") continue;
    const before = keep[key];
    const after = merged[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    out.push({ field: key, kept: after, dropped: before });
  }
  return out;
}

/**
 * Groups works pointing at the same Roblox place — the case where the bot can
 * create a second entry for a game the portfolio already lists.
 */
export function findDuplicateGroups<T extends { href?: string; slug: string }>(
  works: T[],
): Array<{ placeId: string; works: T[] }> {
  const byPlace = new Map<string, T[]>();
  for (const work of works) {
    const placeId = String(work.href ?? "").match(/roblox\.com\/games\/(\d+)/i)?.[1];
    if (!placeId) continue;
    const list = byPlace.get(placeId) ?? [];
    list.push(work);
    byPlace.set(placeId, list);
  }
  return [...byPlace.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([placeId, group]) => ({ placeId, works: group }));
}

/**
 * Picks which entry of a duplicate group survives: the most complete one,
 * scored on having a real title, an image, a description, tags and popularity
 * — so a curated entry always beats a bot-created placeholder.
 */
export function preferredSurvivor<T extends Record<string, unknown>>(works: T[]): T {
  const score = (w: T) => {
    let points = 0;
    if (!isPlaceholderTitle(w["title"])) points += 4;
    if (typeof w["title"] === "string" && w["title"].trim().length > 2) points += 1;
    if (typeof w["image"] === "string" && w["image"].trim()) points += 2;
    if (typeof w["description"] === "string" && w["description"].trim()) points += 2;
    if (Array.isArray(w["tags"]) && w["tags"].length > 0) points += 1;
    if (typeof w["popularity"] === "number") points += 1;
    return points;
  };
  const first = works[0];
  if (!first) throw new Error("preferredSurvivor needs at least one entry");
  return works.reduce((best, w) => (score(w) > score(best) ? w : best), first);
}

/**
 * Entries the bot left unfinished: a placeholder title, or a real title with
 * no image/description. Used by the backfill tool to decide what to fill in.
 */
export function needsBackfill(work: Record<string, unknown>): {
  title: boolean;
  description: boolean;
  image: boolean;
} {
  const title = isPlaceholderTitle(work["title"]);
  const description = !(typeof work["description"] === "string" && work["description"].trim());
  const image = !(typeof work["image"] === "string" && work["image"].trim());
  return { title, description, image };
}
