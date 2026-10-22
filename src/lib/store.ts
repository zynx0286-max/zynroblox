import { createServerOnlyFn } from "@tanstack/react-start";
import { works as staticWorks } from "@/data/works";
import {
  buildCasBody,
  buildCasPath,
  interpretCasResponse,
  shouldBootstrap,
  splitVersion,
} from "@/lib/store-cas";
import type { StoreRow as StoreRowType } from "@/lib/store-cas";
import { readSecret } from "@/lib/read-secret";
import { normalizeWorkStatus } from "@/lib/work-visibility";
import type { Work } from "@/data/works";
import type { DbWork } from "@/lib/works.functions";
import type { SettingsValue, Testimonial, WorkMedia } from "@/lib/site.functions";
import type { Review } from "@/lib/reviews.functions";

// Server-only, self-hosted data store.
//
// Persistence priority:
//   1. Supabase Postgres (`supabase_kv` table via PostgREST, service key) —
//      the primary durable backend when SUPABASE_URL + SUPABASE_SERVICE_KEY
//      are configured. Survives redeploys, region loss of any single provider
//      is mitigated by the KV mirror below.
//   2. Cloudflare KV (`STORE` binding) — used as a MIRROR of the Supabase
//      state and as the primary backend when Supabase is not configured. The
//      filesystem on Workers is ephemeral, so file writes alone are silently
//      lost between isolates (admin looks saved, then reverts).
//   3. JSON file (`data/store.json`) — local dev and Node-server hosts.
//   4. In-memory seed — last resort so the public site still renders. Writes
//      in this mode THROW instead of pretending to succeed.
//
// MULTI-ISOLATE CORRECTNESS: Workers run many isolates. A module-level cache
// that lives forever means an admin edit saved by isolate A is invisible to
// isolate B (edits "revert" for visitors). The cache therefore has a short
// TTL and revalidates from the primary backend in the background; mutations
// always read fresh (through the shared mutation queue) and bump the TTL on
// write.
//
// UPLOADS are stored as separate keys (`upload:<id>`), NOT inside the single
// store value: a handful of base64 images would blow past KV's 25 MB
// per-value limit and make every save fail. The same keys live as rows in
// Supabase when that backend is active.
//
// Both seeded from the static catalog on first run.

export type UploadedFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  createdAt: number;
};

export type StoreShape = {
  works: DbWork[];
  testimonials: Testimonial[];
  reviews: Review[];
  /** HMAC-hashed submitter IPs (or legacy djb2 hashes) — one review per IP ever. */
  reviewIps: string[];
  /** Roblox placeId (string keys) → universeId. Universe ids are stable, so
   *  they're persisted: a cold isolate then needs ONE batched stats request
   *  instead of one lookup per game — per-game bursts get rate-limited by
   *  Roblox on datacenter IPs, which silently dropped games from totals. */
  universeIds: Record<string, number>;
  settings: Record<string, SettingsValue>;
  media: WorkMedia[];
  /** Legacy metadata only — new uploads go to separate blob keys. */
  uploads: UploadedFile[];
};

export type StoreBackend = "supabase" | "kv" | "file" | "memory";

/** Upper bound on persisted one-way IP hashes (oldest entries are dropped). */
const MAX_REVIEW_IPS = 5_000;

function seed(): StoreShape {
  return {
    works: staticWorks.map(
      (w, i) =>
        ({
          ...w,
          id: `work-${w.slug}`,
          sortOrder: i * 10,
          // Catalog entries ship as published; drafts only ever come from the
          // admin panel.
          status: "published",
        }) as DbWork,
    ),
    testimonials: [],
    reviews: [],
    reviewIps: [],
    universeIds: {},
    settings: {},
    media: [],
    uploads: [],
  };
}

// ---------------------------------------------------------------------------
// Secret resolution (Workers env binding first, then Node process.env)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Supabase Postgres backend (primary when configured)
// ---------------------------------------------------------------------------
//
// Uses the REST API (PostgREST) that every Supabase project exposes — no
// SDK dependency, works from any runtime with fetch. The table mirrors the
// old KV keys:
//
//   create table if not exists public.supabase_kv (
//     key   text primary key,
//     value jsonb not null,
//     updated_at timestamptz not null default now()
//   );
//
// The service_role key is a SECRET (never `anon`): it bypasses RLS, so the
// table needs no policies at all and stays unreachable from the browser.

const KV_KEY = "zyn-store-v1";
const KV_UPLOAD_PREFIX = "upload:";

const SUPABASE_STORE_KEY = "zyn-store-v1";
const SUPABASE_UPLOAD_PREFIX = "upload:";

let supabaseCfg: { url: string; serviceKey: string } | null | undefined;

const SUPABASE_TIMEOUT_MS = 10_000;

const resolveSupabaseConfig = createServerOnlyFn(async () => {
  if (supabaseCfg !== undefined) return supabaseCfg;
  // Local dev stays file-backed even when secrets are present in .env.local:
  // pointing the dev server at production Postgres would make local admin
  // edits go live. (Workers have no meaningful NODE_ENV, so production is
  // unaffected — same pattern as owner-session.ts.)
  if (process.env?.["NODE_ENV"] === "development") {
    supabaseCfg = null;
    return supabaseCfg;
  }
  const url = (await readSecret("SUPABASE_URL")).replace(/\/+$/, "");
  // Service role only — the anon/publishable key cannot write and would make
  // every save silently fail. Shape-guarded so a wrong-but-present value
  // (e.g. the publishable key pasted by mistake) can't be "configured".
  const serviceKey = await readSecret("SUPABASE_SERVICE_KEY");
  const plausible =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) &&
    (serviceKey.startsWith("sb_secret_") || serviceKey.startsWith("eyJ"));
  supabaseCfg = plausible ? { url, serviceKey } : null;
  return supabaseCfg;
});

const supabaseFetch = createServerOnlyFn(
  async (
    path: string,
    init: RequestInit & { signal?: AbortSignal } = {},
  ): Promise<Response | null> => {
    const cfg = await resolveSupabaseConfig();
    if (!cfg) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
    if (init.signal) {
      if (init.signal.aborted) controller.abort();
      else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      const res = await fetch(`${cfg.url}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          apikey: cfg.serviceKey,
          Authorization: `Bearer ${cfg.serviceKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init.headers as Record<string, string> | undefined),
        },
      });
      // Workers: a Response whose body is never read deadlocks the isolate.
      // Callers that don't need the body MUST cancel it (see discardBody).
      return res;
    } finally {
      clearTimeout(timeout);
    }
  },
);

async function discardBody(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    // already consumed or unusable — nothing to do
  }
}

/**
 * The store row plus its optimistic-locking version (null = never written by
 * CAS code). The version lives INSIDE the JSONB document (field `version`),
 * not in a separate column — compare-and-swap then needs no schema changes:
 * PATCH …&value->>version=eq.<expected> only replaces the row when nobody else
 * has bumped it in the meantime. Two isolates can no longer silently overwrite
 * each other; the loser re-applies its mutation onto the winner's data instead.
 *
 * The locking rules themselves live in store-cas.ts so they can be unit-tested
 * without booting Workers (see store-cas.test.ts).
 */
type StoreRow = StoreRowType<StoreShape>;

const readSupabaseStore = createServerOnlyFn(async (): Promise<StoreRow | null> => {
  const res = await supabaseFetch(
    `/rest/v1/supabase_kv?key=eq.${encodeURIComponent(SUPABASE_STORE_KEY)}&select=value&limit=1`,
  );
  if (!res) return null; // Not configured.
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    await discardBody(res);
    throw new Error(
      `Supabase store read failed (${res.status}): ${text.slice(0, 300) || res.statusText}`,
    );
  }
  const rows = (await res.json().catch(() => null)) as Array<{ value: unknown }> | null;
  return splitVersion(rows?.[0]?.value);
});

type CasWrite = { status: "ok"; version: number } | { status: "conflict" } | { status: "failed" };

/**
 * Persists the store with optimistic locking on the embedded version field.
 * `expected === null` bootstraps: an unconditional upsert that stamps
 * version 1 (used for the very first write and legacy fallback).
 *
 * `key` defaults to the main store document but the same protocol is used for
 * the activity log, which lives in its own row so appending to it can never
 * bloat (or contend with) the CMS document.
 *
 * URL/body construction and response interpretation come from store-cas.ts so
 * the exact rules production relies on are the ones unit-tested there.
 */
const writeSupabaseStoreCas = createServerOnlyFn(
  async (store: unknown, expected: number | null, key = SUPABASE_STORE_KEY): Promise<CasWrite> => {
    if (!shouldBootstrap(expected)) {
      const res = await supabaseFetch(buildCasPath(key, expected as number), {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: buildCasBody(store as Record<string, unknown>, expected),
      });
      if (res && res.ok) {
        const rows = (await res.json().catch(() => null)) as Array<unknown> | null;
        await discardBody(res);
        // Empty array = the version filter matched nothing = someone wrote
        // between our read and write.
        return interpretCasResponse(true, rows, expected);
      }
      if (res) {
        await res.text().catch(() => "");
        await discardBody(res);
      }
      return { status: "failed" };
    }
    // Bootstrap / legacy: unconditional upsert that stamps version 1.
    const res = await supabaseFetch(`/rest/v1/supabase_kv?key=eq.${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ key, value: { ...(store as object), version: 1 } }),
    });
    if (!res) return { status: "failed" };
    if (res.ok) {
      await discardBody(res);
      return { status: "ok", version: 1 };
    }
    await discardBody(res);
    return { status: "failed" };
  },
);

const putUploadBlobSupabase = createServerOnlyFn(async (blob: UploadedBlob): Promise<boolean> => {
  const res = await supabaseFetch(
    `/rest/v1/supabase_kv?key=eq.${encodeURIComponent(`${SUPABASE_UPLOAD_PREFIX}${blob.id}`)}`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        key: `${SUPABASE_UPLOAD_PREFIX}${blob.id}`,
        value: blob,
      }),
    },
  );
  if (!res) return false;
  if (!res.ok) {
    await discardBody(res);
    const text = await res.text().catch(() => "");
    throw new Error(
      `Supabase upload write failed (${res.status}): ${text.slice(0, 300) || res.statusText}`,
    );
  }
  await discardBody(res);
  return true;
});

const getUploadBlobSupabase = createServerOnlyFn(
  async (id: string): Promise<UploadedBlob | null> => {
    const res = await supabaseFetch(
      `/rest/v1/supabase_kv?key=eq.${encodeURIComponent(
        `${SUPABASE_UPLOAD_PREFIX}${id}`,
      )}&select=value&limit=1`,
    );
    if (!res) return null;
    if (!res.ok) {
      await discardBody(res);
      return null;
    }
    const rows = (await res.json().catch(() => null)) as Array<{
      value: UploadedBlob | null;
    }> | null;
    const value = rows?.[0]?.value;
    return value && typeof value === "object" && typeof value.dataBase64 === "string"
      ? value
      : null;
  },
);

const deleteUploadBlobSupabase = createServerOnlyFn(async (id: string): Promise<boolean> => {
  const res = await supabaseFetch(
    `/rest/v1/supabase_kv?key=eq.${encodeURIComponent(`${SUPABASE_UPLOAD_PREFIX}${id}`)}`,
    { method: "DELETE" },
  );
  if (!res) return false;
  await discardBody(res);
  return res.ok;
});

// ---------------------------------------------------------------------------
// Cloudflare KV backend (mirror + fallback; primary when Supabase not set)
// ---------------------------------------------------------------------------

type KvBinding = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

let kvBinding: KvBinding | null | undefined;

const resolveKvBinding = createServerOnlyFn(async (): Promise<KvBinding | null> => {
  if (kvBinding !== undefined) return kvBinding;
  kvBinding = null;
  try {
    // Resolves only on Workers/wrangler. @vite-ignore keeps bundlers from
    // trying to statically resolve it (would break the client/Node builds).
    const cf = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
      env?: Record<string, unknown>;
    };
    const maybe = cf?.env?.["STORE"];
    if (
      maybe &&
      typeof (maybe as KvBinding).get === "function" &&
      typeof (maybe as KvBinding).put === "function"
    ) {
      kvBinding = maybe as KvBinding;
    }
  } catch {
    kvBinding = null;
  }
  return kvBinding;
});

const readKvStore = createServerOnlyFn(async (): Promise<StoreShape | null> => {
  const binding = await resolveKvBinding();
  if (!binding) return null;
  let raw: unknown;
  try {
    raw = await binding.get(KV_KEY, "json");
  } catch (error) {
    throw new Error(
      `Store KV read failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!raw || typeof raw !== "object") return null;
  return raw as StoreShape;
});

const writeKvStore = createServerOnlyFn(async (store: StoreShape): Promise<boolean> => {
  const binding = await resolveKvBinding();
  if (!binding) return false;
  try {
    await binding.put(KV_KEY, JSON.stringify(store));
    return true;
  } catch (error) {
    throw new Error(
      `Store KV write failed (changes NOT saved): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
});

// --- Blob uploads (separate keys so one image can never break the store) ---

export type UploadedBlob = {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataBase64: string;
  createdAt: number;
};

const putUploadBlobKv = createServerOnlyFn(async (blob: UploadedBlob): Promise<boolean> => {
  const binding = await resolveKvBinding();
  if (!binding) return false;
  try {
    await binding.put(`${KV_UPLOAD_PREFIX}${blob.id}`, JSON.stringify(blob));
    return true;
  } catch (error) {
    throw new Error(
      `Upload KV write failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

const getUploadBlobKv = createServerOnlyFn(async (id: string): Promise<UploadedBlob | null> => {
  const binding = await resolveKvBinding();
  if (!binding) return null;
  try {
    const raw = (await binding.get(`${KV_UPLOAD_PREFIX}${id}`, "json")) as UploadedBlob | null;
    return raw && typeof raw === "object" && typeof raw.dataBase64 === "string" ? raw : null;
  } catch {
    return null;
  }
});

const deleteUploadBlobKv = createServerOnlyFn(async (id: string): Promise<boolean> => {
  const binding = await resolveKvBinding();
  if (!binding) return false;
  try {
    await binding.delete(`${KV_UPLOAD_PREFIX}${id}`);
    return true;
  } catch {
    return false;
  }
});

// ---------------------------------------------------------------------------
// File backend (local dev / Node hosts)
// ---------------------------------------------------------------------------

const readStoreJson = createServerOnlyFn(async (): Promise<StoreShape | null> => {
  let fs: typeof import("node:fs");
  try {
    fs = await import("node:fs");
  } catch {
    return null; // Non-Node runtime (Workers) — no filesystem available.
  }
  const file = `${process.cwd()}/data/store.json`;
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as StoreShape;
  } catch {
    return null;
  }
});

const writeStoreJson = createServerOnlyFn(async (store: StoreShape): Promise<boolean> => {
  let fs: typeof import("node:fs");
  try {
    fs = await import("node:fs");
  } catch {
    return false;
  }
  try {
    const dir = `${process.cwd()}/data`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/store.json`, JSON.stringify(store, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
});

function blobFilePath(id: string): string {
  return `${process.cwd()}/data/uploads/${id.replace(/[^a-zA-Z0-9-]/g, "")}.json`;
}

const writeUploadBlobFile = createServerOnlyFn(async (blob: UploadedBlob): Promise<boolean> => {
  let fs: typeof import("node:fs");
  try {
    fs = await import("node:fs");
  } catch {
    return false;
  }
  try {
    const dir = `${process.cwd()}/data/uploads`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(blobFilePath(blob.id), JSON.stringify(blob), "utf8");
    return true;
  } catch {
    return false;
  }
});

const readUploadBlobFile = createServerOnlyFn(async (id: string): Promise<UploadedBlob | null> => {
  let fs: typeof import("node:fs");
  try {
    fs = await import("node:fs");
  } catch {
    return null;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(blobFilePath(id), "utf8")) as UploadedBlob;
    return raw && typeof raw.dataBase64 === "string" ? raw : null;
  } catch {
    return null;
  }
});

const deleteUploadBlobFile = createServerOnlyFn(async (id: string): Promise<boolean> => {
  let fs: typeof import("node:fs");
  try {
    fs = await import("node:fs");
  } catch {
    return false;
  }
  try {
    fs.rmSync(blobFilePath(id), { force: true });
    return true;
  } catch {
    return false;
  }
});

// ---------------------------------------------------------------------------
// Upload blob API (runtime-agnostic)
// ---------------------------------------------------------------------------

/** Persists an upload in its own storage key. Throws if it can't persist. */
export async function putUploadBlob(blob: UploadedBlob): Promise<void> {
  const primary = await resolveSupabaseConfig();
  if (primary && (await putUploadBlobSupabase(blob))) {
    // Mirror to KV, best-effort (same replication pattern as the store).
    await putUploadBlobKv(blob).catch(() => {});
    return;
  }
  if (await putUploadBlobKv(blob)) return;
  if (await writeUploadBlobFile(blob)) return;
  throw new Error(
    "Upload storage is not configured: no Supabase secrets, no Cloudflare KV `STORE` " +
      "binding and no writable filesystem.",
  );
}

/** Reads an upload by id, or null when missing/corrupt. */
export async function getUploadBlob(id: string): Promise<UploadedBlob | null> {
  const clean = id.replace(/[^a-zA-Z0-9-]/g, "");
  if (!clean) return null;
  if (await resolveSupabaseConfig()) {
    const fromSupabase = await getUploadBlobSupabase(clean);
    if (fromSupabase) return fromSupabase;
  }
  return (await getUploadBlobKv(clean)) ?? (await readUploadBlobFile(clean));
}

/** Deletes an upload by id. Best-effort. */
export async function deleteUploadBlob(id: string): Promise<void> {
  const clean = id.replace(/[^a-zA-Z0-9-]/g, "");
  if (!clean) return;
  if (await resolveSupabaseConfig()) await deleteUploadBlobSupabase(clean).catch(() => {});
  await deleteUploadBlobKv(clean);
  await deleteUploadBlobFile(clean);
}

// ---------------------------------------------------------------------------
// Store access
// ---------------------------------------------------------------------------

let cache: StoreShape | null = null;
let backend: StoreBackend | null = null;
let cacheReadAt = 0;
let revalidating: Promise<void> | null = null;
/** Optimistic-locking version of the cached Supabase row (null = unknown/legacy). */
let storeVersion: number | null = null;

/** Short TTL so other isolates' writes become visible quickly on Workers. */
const CACHE_TTL_MS = 30_000;

/** Keeps only sane placeId → universeId entries from persisted JSON. */
function sanitizeUniverseIds(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d+$/.test(k) && typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}

function normalize(raw: StoreShape): StoreShape {
  const fallback = seed();
  const storedWorks = Array.isArray(raw.works) ? raw.works : fallback.works;
  const reviewIps = Array.isArray((raw as StoreShape).reviewIps)
    ? (raw as StoreShape).reviewIps
    : [];
  return {
    works: mergeStaticWorks(storedWorks, fallback.works),
    testimonials: Array.isArray(raw.testimonials) ? raw.testimonials : [],
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    // Cap the IP-hash list so it can never grow unbounded toward the KV limit.
    reviewIps: reviewIps.slice(-MAX_REVIEW_IPS),
    universeIds: sanitizeUniverseIds(raw.universeIds),
    settings: raw.settings && typeof raw.settings === "object" ? raw.settings : {},
    media: Array.isArray(raw.media) ? raw.media : [],
    uploads: Array.isArray(raw.uploads) ? raw.uploads : [],
  };
}

/**
 * Rows written before drafts existed have no `status`. Coerce them (and any
 * garbage value) to "published" so an upgrade never empties the portfolio.
 * Applied on every load, so the field can't stay missing in memory.
 */
function withWorkStatus(work: DbWork): DbWork {
  return { ...work, status: normalizeWorkStatus(work.status) };
}

/**
 * Unions persisted works with the static catalog by slug. Stored entries win
 * (so admin CMS edits are never clobbered), but new catalog entries added in
 * later deploys are appended instead of being invisible until the key is
 * wiped. Order follows the static catalog, admin-only extras go last.
 */
function mergeStaticWorks(stored: DbWork[], seeded: DbWork[]): DbWork[] {
  const storedWorks = stored.map(withWorkStatus);
  const seededWorks = seeded.map(withWorkStatus);
  const bySlug = new Map(storedWorks.map((w) => [w.slug, w]));
  const merged = seededWorks.map((s) => bySlug.get(s.slug) ?? s);
  const seededSlugs = new Set(seededWorks.map((s) => s.slug));
  for (const w of storedWorks) {
    if (!seededSlugs.has(w.slug)) merged.push(w);
  }
  return merged;
}

/** Which backend should own the data right now. */
async function resolvePrimaryBackend(): Promise<"supabase" | "kv"> {
  return (await resolveSupabaseConfig()) ? "supabase" : "kv";
}

const revalidateFromPrimary = createServerOnlyFn(async (): Promise<void> => {
  const primary = await resolvePrimaryBackend();
  if (primary === "supabase") {
    let row: StoreRow | null = null;
    try {
      row = await readSupabaseStore();
    } catch {
      // Transient Supabase error: keep serving the current snapshot instead
      // of tearing it down. `cacheReadAt` stays behind, so revalidation is
      // retried on the next request — self-healing once Supabase recovers.
      return;
    }
    if (row) {
      backend = "supabase";
      cache = normalize(row.store);
      storeVersion = row.version;
      cacheReadAt = Date.now();
    } else {
      // Empty table (first run or manual wipe): seed it.
      backend = "supabase";
      cache = seed();
      cacheReadAt = Date.now();
      storeVersion = null;
      const wrote = await writeSupabaseStoreCas(cache, null).catch(() => ({
        status: "failed" as const,
      }));
      if (wrote.status === "ok") storeVersion = wrote.version;
    }
    return;
  }

  const kvStore = await readKvStore();
  if (kvStore) {
    backend = "kv";
    cache = normalize(kvStore);
    // Data that didn't come from Supabase carries no primary version: forget
    // the old one so a later Supabase write is forced through a re-read.
    storeVersion = null;
    cacheReadAt = Date.now();
  } else {
    // Key vanished (manual wipe) — reseed so the site keeps rendering.
    cache = seed();
    cacheReadAt = Date.now();
    await writeKvStore(cache);
  }
});

export async function loadStore(): Promise<StoreShape> {
  const primary = await resolvePrimaryBackend();

  if (cache) {
    // Stale-while-revalidate: serve the cached snapshot immediately and
    // refresh from the primary backend in the background. Revalidation runs
    // when the TTL lapses, or right away when the active backend differs
    // from the desired primary (a Worker that cold-started during a Supabase
    // outage is on the KV fallback and must retry until it can heal).
    // file/memory modes never revalidate — they have no remote to pull from.
    const expired = Date.now() - cacheReadAt >= CACHE_TTL_MS;
    const canRevalidate = backend === "kv" || backend === "supabase";
    const healing = backend === "kv" && primary === "supabase";
    if (!canRevalidate || (!expired && !healing)) return cache;
    if (!revalidating) {
      revalidating = revalidateFromPrimary()
        .catch(() => {
          // Backend still failing — back off for a full TTL instead of
          // hammering it on every request, and keep serving this snapshot.
          cacheReadAt = Date.now();
        })
        .finally(() => {
          revalidating = null;
        });
    }
    return cache;
  }

  // 1. Supabase Postgres — configured via SUPABASE_URL + SUPABASE_SERVICE_KEY.
  if (primary === "supabase") {
    let row: StoreRow | null = null;
    let supabaseErrored = false;
    try {
      row = await readSupabaseStore();
    } catch {
      supabaseErrored = true;
    }
    if (row) {
      backend = "supabase";
      cache = normalize(row.store);
      storeVersion = row.version;
      cacheReadAt = Date.now();
      return cache;
    }
    if (!supabaseErrored) {
      // Table reachable and empty: MIGRATION PATH — adopt Cloudflare KV's
      // data (the pre-Supabase backend) instead of reseeding, so existing
      // works/settings/reviews survive the switch. A virgin project seeds.
      let kvStore: StoreShape | null = null;
      try {
        kvStore = await readKvStore();
      } catch {
        /* fall through to seeding */
      }
      const adopted = kvStore ? normalize(kvStore) : seed();
      storeVersion = null;
      const wrote = await writeSupabaseStoreCas(adopted, null);
      if (wrote.status === "ok") {
        storeVersion = wrote.version;
        backend = "supabase";
        cache = adopted;
        cacheReadAt = Date.now();
        return cache;
      }
    }
    // Supabase unreachable (missing table, outage, wrong URL): fall through
    // to KV/file so the site renders and admin saves still persist.
    // `cacheReadAt` is left stale so the next request retries Supabase.
  }

  // 2. Cloudflare KV — survives Worker restarts/redeploys.
  if (await resolveKvBinding()) {
    backend = "kv";
    const kvStore = await readKvStore();
    if (kvStore) {
      cache = normalize(kvStore);
    } else {
      // First run against this namespace: persist the seed so later reads
      // (possibly from another isolate) see the same data.
      cache = seed();
      await writeKvStore(cache);
    }
    // Adopted from a fallback backend: the snapshot has no Supabase version,
    // so any later primary write must re-read instead of trusting this copy.
    storeVersion = null;
    cacheReadAt = Date.now();
    return cache;
  }

  // 3. Local JSON file.
  const raw = await readStoreJson();
  if (raw) {
    backend = "file";
    cache = normalize(raw);
    storeVersion = null;
    cacheReadAt = Date.now();
    return cache;
  }
  // No file yet (or no readable file): probe whether the filesystem is
  // writable by persisting the seed. On Workers there is no fs, so this
  // returns false and we fall through to memory mode.
  const seeded = seed();
  if (await writeStoreJson(seeded)) {
    backend = "file";
    cache = seeded;
    cacheReadAt = Date.now();
    return cache;
  }

  // 4. Memory only — public pages render, but writes will throw.
  backend = "memory";
  cache = seed();
  storeVersion = null;
  cacheReadAt = Date.now();
  return cache;
}

/** Persisted placeId → universeId map (Roblox universe ids never change). */
export async function getUniverseIds(): Promise<Record<string, number>> {
  return (await loadStore()).universeIds;
}

/** Merges newly resolved universe ids into the store. No-op when nothing is
 *  new, so the steady state doesn't write to the backend on every refresh. */
export async function saveUniverseIds(ids: Record<string, number>): Promise<void> {
  const entries = Object.entries(ids).filter(
    ([k, v]) => /^\d+$/.test(k) && Number.isFinite(v) && v > 0,
  );
  if (entries.length === 0) return;
  const current = await loadStore();
  const fresh = entries.filter(([k, v]) => current.universeIds[k] !== v);
  if (fresh.length === 0) return;
  await mutate((store) => {
    for (const [k, v] of fresh) store.universeIds[k] = v;
  });
}

type PersistOutcome = "written" | "conflict";

async function persistStore(): Promise<PersistOutcome> {
  if (!cache) return "written";
  const primary = await resolvePrimaryBackend();

  if (primary === "supabase") {
    backend = "supabase";
    // OPTIMISTIC LOCKING: exactly one conditional write attempt. There is
    // deliberately NO unconditional fallback here — writing a snapshot whose
    // version we don't know is precisely how a stale isolate silently reverts
    // somebody else's edit. Anything other than a confirmed CAS is reported
    // as a conflict so `mutate()` re-reads the winner and re-applies.
    const result = await writeSupabaseStoreCas(cache, storeVersion).catch(() => ({
      status: "failed" as const,
    }));
    if (result.status === "ok") {
      storeVersion = result.version;
      // Mirror to KV (best-effort): a free-tier hiccup on either provider
      // then degrades to a consistent-but-stale copy instead of data loss.
      if (await resolveKvBinding()) await writeKvStore(cache).catch(() => {});
      return "written";
    }
    // Conflict (someone else won) OR an unknown/failed version. Both mean
    // "my snapshot may be stale" → re-read and retry.
    return "conflict";
  }

  if (backend === "kv" || (await resolveKvBinding())) {
    backend = "kv";
    await writeKvStore(cache);
    return "written";
  }
  if (await writeStoreJson(cache)) {
    backend = "file";
    return "written";
  }
  backend = "memory";
  throw new Error(
    "Persistence is not configured: no Supabase secrets, no Cloudflare KV `STORE` binding " +
      "and no writable filesystem. Changes are kept in memory only and will be lost.",
  );
}

// Mutations are serialized through a shared promise chain so concurrent admin
// saves (or a save racing a review submit) can't interleave read-modify-write
// cycles and drop each other's changes.
let mutationQueue: Promise<unknown> = Promise.resolve();

/**
 * Applies a mutation to the store and persists it. Throws if it can't persist.
 * On an optimistic-locking conflict (another isolate wrote first), the SAME
 * mutation is re-applied onto the winner's fresh snapshot and retried —
 * concurrent writers merge instead of silently dropping each other's changes.
 */
export function mutate<T>(fn: (store: StoreShape) => T): Promise<T> {
  const run = async (): Promise<T> => {
    let lastResult: T | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      const store = await loadStore();
      lastResult = fn(store);
      // A background revalidation may have swapped in a newer snapshot while
      // we were mutating. Persisting now would write someone else's document
      // and silently drop our edit, so re-apply on top of the fresh one.
      if (cache !== store) continue;
      const outcome = await persistStore();
      if (outcome === "written") {
        // Our own write is by definition the latest state — push the TTL
        // forward so we don't immediately re-pull what we just wrote.
        cacheReadAt = Date.now();
        return lastResult as T;
      }
      // Conflict: pull the winner's snapshot (fresh data + version) and
      // re-apply this mutation on top of it.
      await revalidateFromPrimary();
    }
    // Either extremely hot contention, or a row that predates optimistic
    // locking (no embedded version yet). Re-read the winner, re-apply the
    // mutation, then land it: a CAS if we now know the version, otherwise one
    // unconditional stamp of data that was read milliseconds ago. This is the
    // only place an unconditional Supabase write is allowed.
    await revalidateFromPrimary().catch(() => {});
    lastResult = fn(cache as StoreShape);
    if ((await resolvePrimaryBackend()) === "supabase") {
      if (storeVersion === null) {
        const boot = await writeSupabaseStoreCas(cache as StoreShape, null).catch(() => ({
          status: "failed" as const,
        }));
        if (boot.status === "ok") storeVersion = boot.version;
      } else {
        await persistStore().catch(() => {});
      }
    }
    if (await resolveKvBinding()) await writeKvStore(cache as StoreShape).catch(() => {});
    cacheReadAt = Date.now();
    return lastResult as T;
  };
  const p = mutationQueue.then(run, run);
  mutationQueue = p.catch(() => {});
  return p;
}

/** Which backend is active. Used by the admin status badge (owner-only). */
export async function getStoreBackendStatus(): Promise<{
  backend: StoreBackend;
  works: number;
  persisted: boolean;
}> {
  const store = await loadStore();
  const active: StoreBackend = backend ?? "memory";
  return { backend: active, works: store.works.length, persisted: active !== "memory" };
}

/** Re-exports so types can be imported from one place. */
export type { Work };

// ---------------------------------------------------------------------------
// Activity log
//
// An append-only record of what happened to the portfolio (entries added by
// the bot, merges, nightly refresh runs). It lives in its OWN row rather than
// inside the store document for two reasons:
//
//   1. It can grow freely without bloating the CMS document that every page
//      read and every admin save has to parse.
//   2. Bot ingest, the cron task and the admin panel can all append at once
//      without contending on the store's optimistic lock — a lost log line is
//      never worth stalling a CMS write for.
//
// Same compare-and-swap protocol as the store, capped at MAX_ACTIVITY entries
// so it can never grow without bound.
// ---------------------------------------------------------------------------

const ACTIVITY_KEY = "zyn-activity-v1";

export type ActivityKind =
  | "entry.created"
  | "entry.placeholder"
  | "entry.published"
  | "entry.unpublished"
  | "entry.merged"
  | "refresh.ran"
  | "system";

export type ActivityEntry = {
  /** ISO timestamp. */
  at: string;
  kind: ActivityKind;
  /** One line, already phrased for a human. */
  summary: string;
  slug?: string;
  detail?: Record<string, string | number>;
};

type ActivityDoc = { entries: ActivityEntry[] };

/** Oldest entries are dropped past this count. */
const MAX_ACTIVITY = 400;

const readActivitySupabase = createServerOnlyFn(
  async (): Promise<{ doc: ActivityDoc; version: number | null } | null> => {
    const res = await supabaseFetch(
      `/rest/v1/supabase_kv?key=eq.${encodeURIComponent(ACTIVITY_KEY)}&select=value&limit=1`,
    );
    if (!res) return null; // not configured
    if (!res.ok) {
      await discardBody(res);
      return null;
    }
    const rows = (await res.json().catch(() => null)) as Array<{ value: unknown }> | null;
    const row = splitVersion<ActivityDoc>(rows?.[0]?.value);
    if (!row) return null;
    const entries = Array.isArray(row.store?.entries) ? row.store.entries : [];
    return { doc: { entries }, version: row.version };
  },
);

/** Appends entries, newest last, retrying on a lost optimistic-lock race. */
export async function appendActivity(entries: ActivityEntry[]): Promise<void> {
  if (entries.length === 0) return;
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await readActivitySupabase();
    const merged = [...(current?.doc.entries ?? []), ...entries].slice(-MAX_ACTIVITY);
    const written = await writeSupabaseStoreCas(
      { entries: merged },
      current?.version ?? null,
      ACTIVITY_KEY,
    );
    if (written.status === "ok") return;
    // Conflict (someone appended first) or the backend is unavailable. The log
    // is best-effort telemetry — never let it fail the operation that triggered
    // it, and never retry forever.
    if (written.status === "failed") return;
  }
}

/** The activity log, newest last. Empty when nothing has been recorded yet. */
export async function getActivity(): Promise<ActivityEntry[]> {
  try {
    const current = await readActivitySupabase();
    return current?.doc.entries ?? [];
  } catch {
    return [];
  }
}

/**
 * Reads an auxiliary row (any key other than the main store document) with its
 * optimistic-lock version. Used by the activity log and the notification
 * config so neither has to grow the CMS document.
 */
export async function readAuxRow<T extends object>(
  key: string,
): Promise<{ doc: T; version: number | null } | null> {
  const res = await supabaseFetch(
    `/rest/v1/supabase_kv?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
  );
  if (!res) return null; // Supabase not configured
  if (!res.ok) {
    await discardBody(res);
    return null;
  }
  const rows = (await res.json().catch(() => null)) as Array<{ value: unknown }> | null;
  const row = splitVersion<T>(rows?.[0]?.value);
  return row ? { doc: row.store, version: row.version } : null;
}

/**
 * Writes an auxiliary row using the same compare-and-swap protocol as the main
 * store. Returns the same result shape so callers can retry on conflict.
 */
export async function writeAuxRow(
  key: string,
  doc: unknown,
  expected: number | null,
): Promise<CasWrite> {
  return writeSupabaseStoreCas(doc, expected, key);
}
