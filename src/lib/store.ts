import { createServerOnlyFn } from "@tanstack/react-start";
import { works as staticWorks } from "@/data/works";
import type { Work } from "@/data/works";
import type { DbWork } from "@/lib/works.functions";
import type { SettingsValue, Testimonial, WorkMedia } from "@/lib/site.functions";
import type { Review } from "@/lib/reviews.functions";

// Server-only, self-hosted data store.
//
// Persistence priority:
//   1. Cloudflare KV (`STORE` binding) — the only backend that survives on
//      Workers. The filesystem there is ephemeral, so file writes alone are
//      silently lost between isolates (admin looks saved, then reverts).
//   2. JSON file (`data/store.json`) — local dev and Node-server hosts.
//   3. In-memory seed — last resort so the public site still renders. Writes
//      in this mode THROW instead of pretending to succeed.
//
// MULTI-ISOLATE CORRECTNESS: Workers run many isolates. A module-level cache
// that lives forever means an admin edit saved by isolate A is invisible to
// isolate B (edits "revert" for visitors). The cache therefore has a short
// TTL and revalidates from KV in the background; mutations always read fresh
// (through the shared mutation queue) and bump the TTL on write.
//
// UPLOADS are stored as separate KV keys (`upload:<id>`), NOT inside the
// single store value: a handful of base64 images would blow past KV's 25 MB
// per-value limit and make every save fail.
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

export type StoreBackend = "kv" | "file" | "memory";

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
// Cloudflare KV backend (production on Workers)
// ---------------------------------------------------------------------------

const KV_KEY = "zyn-store-v1";
const KV_UPLOAD_PREFIX = "upload:";

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

// --- Blob uploads (separate KV keys so one image can never break the store) --

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
  if (await putUploadBlobKv(blob)) return;
  if (await writeUploadBlobFile(blob)) return;
  throw new Error(
    "Upload storage is not configured: no Cloudflare KV `STORE` binding and no writable filesystem.",
  );
}

/** Reads an upload by id, or null when missing/corrupt. */
export async function getUploadBlob(id: string): Promise<UploadedBlob | null> {
  const clean = id.replace(/[^a-zA-Z0-9-]/g, "");
  if (!clean) return null;
  return (await getUploadBlobKv(clean)) ?? (await readUploadBlobFile(clean));
}

/** Deletes an upload by id. Best-effort. */
export async function deleteUploadBlob(id: string): Promise<void> {
  const clean = id.replace(/[^a-zA-Z0-9-]/g, "");
  if (!clean) return;
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
 * Unions persisted works with the static catalog by slug. Stored entries win
 * (so admin CMS edits are never clobbered), but new catalog entries added in
 * later deploys are appended instead of being invisible until the KV key is
 * wiped. Order follows the static catalog, admin-only extras go last.
 */
function mergeStaticWorks(stored: DbWork[], seeded: DbWork[]): DbWork[] {
  const bySlug = new Map(stored.map((w) => [w.slug, w]));
  const merged = seeded.map((s) => bySlug.get(s.slug) ?? s);
  const seededSlugs = new Set(seeded.map((s) => s.slug));
  for (const w of stored) {
    if (!seededSlugs.has(w.slug)) merged.push(w);
  }
  return merged;
}

const revalidateFromKv = createServerOnlyFn(async (): Promise<void> => {
  const kvStore = await readKvStore();
  if (kvStore) {
    cache = normalize(kvStore);
    cacheReadAt = Date.now();
  } else {
    // Key vanished (manual wipe) — reseed so the site keeps rendering.
    cache = seed();
    cacheReadAt = Date.now();
    await writeKvStore(cache);
  }
});

export async function loadStore(): Promise<StoreShape> {
  if (cache) {
    // Stale-while-revalidate: serve the cached snapshot immediately and
    // refresh from KV in the background once the TTL lapses. Single-flight.
    if (backend !== "kv" || Date.now() - cacheReadAt < CACHE_TTL_MS) return cache;
    if (!revalidating) {
      revalidating = revalidateFromKv()
        .catch(() => {
          /* keep serving the previous snapshot on transient KV errors */
        })
        .finally(() => {
          revalidating = null;
        });
    }
    return cache;
  }

  // 1. Cloudflare KV — survives Worker restarts/redeploys.
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
    cacheReadAt = Date.now();
    return cache;
  }

  // 2. Local JSON file.
  const raw = await readStoreJson();
  if (raw) {
    backend = "file";
    cache = normalize(raw);
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

  // 3. Memory only — public pages render, but writes will throw.
  backend = "memory";
  cache = seed();
  cacheReadAt = Date.now();
  return cache;
}

/** Persisted placeId → universeId map (Roblox universe ids never change). */
export async function getUniverseIds(): Promise<Record<string, number>> {
  return (await loadStore()).universeIds;
}

/** Merges newly resolved universe ids into the store. No-op when nothing is
 *  new, so the steady state doesn't write to KV on every stats refresh. */
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

async function persistStore(): Promise<void> {
  if (!cache) return;
  if (backend === "kv" || (await resolveKvBinding())) {
    backend = "kv";
    await writeKvStore(cache);
    return;
  }
  if (await writeStoreJson(cache)) {
    backend = "file";
    return;
  }
  backend = "memory";
  throw new Error(
    "Persistence is not configured: no Cloudflare KV `STORE` binding and no writable " +
      "filesystem. Changes are kept in memory only and will be lost. " +
      "Create a KV namespace and bind it as STORE in wrangler.json, then redeploy.",
  );
}

// Mutations are serialized through a shared promise chain so concurrent admin
// saves (or a save racing a review submit) can't interleave read-modify-write
// cycles and drop each other's changes.
let mutationQueue: Promise<unknown> = Promise.resolve();

/** Applies a mutation to the store and persists it. Throws if it can't persist. */
export function mutate<T>(fn: (store: StoreShape) => T): Promise<T> {
  const run = async (): Promise<T> => {
    const store = await loadStore();
    const result = fn(store);
    await persistStore();
    // Our own write is by definition the latest state — push the TTL forward
    // so we don't immediately re-pull what we just wrote.
    cacheReadAt = Date.now();
    return result;
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
