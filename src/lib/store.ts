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
  settings: Record<string, SettingsValue>;
  media: WorkMedia[];
  uploads: UploadedFile[];
};

export type StoreBackend = "kv" | "file" | "memory";

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
    settings: {},
    media: [],
    uploads: [],
  };
}

// ---------------------------------------------------------------------------
// Cloudflare KV backend (production on Workers)
// ---------------------------------------------------------------------------

const KV_KEY = "zyn-store-v1";

type KvBinding = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
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

// ---------------------------------------------------------------------------
// Store access
// ---------------------------------------------------------------------------

let cache: StoreShape | null = null;
let backend: StoreBackend | null = null;

function normalize(raw: StoreShape): StoreShape {
  const fallback = seed();
  const storedWorks = Array.isArray(raw.works) ? raw.works : fallback.works;
  return {
    works: mergeStaticWorks(storedWorks, fallback.works),
    testimonials: Array.isArray(raw.testimonials) ? raw.testimonials : [],
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
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

export async function loadStore(): Promise<StoreShape> {
  if (cache) return cache;

  // 1. Cloudflare KV — survives Worker restarts/redeploys.
  const kvStore = await readKvStore();
  if (await resolveKvBinding()) {
    backend = "kv";
    if (kvStore) {
      cache = normalize(kvStore);
    } else {
      // First run against this namespace: persist the seed so later reads
      // (possibly from another isolate) see the same data.
      cache = seed();
      await writeKvStore(cache);
    }
    return cache;
  }

  // 2. Local JSON file.
  const raw = await readStoreJson();
  if (raw) {
    backend = "file";
    cache = normalize(raw);
    return cache;
  }
  // No file yet (or no readable file): probe whether the filesystem is
  // writable by persisting the seed. On Workers there is no fs, so this
  // returns false and we fall through to memory mode.
  const seeded = seed();
  if (await writeStoreJson(seeded)) {
    backend = "file";
    cache = seeded;
    return cache;
  }

  // 3. Memory only — public pages render, but writes will throw.
  backend = "memory";
  cache = seed();
  return cache;
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

/** Applies a mutation to the store and persists it. Throws if it can't persist. */
export async function mutate<T>(fn: (store: StoreShape) => T): Promise<T> {
  const store = await loadStore();
  const result = fn(store);
  await persistStore();
  return result;
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
