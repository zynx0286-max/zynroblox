import { createServerOnlyFn } from "@tanstack/react-start";
import { works as staticWorks } from "@/data/works";
import type { Work } from "@/data/works";
import type { DbWork } from "@/lib/works.functions";
import type { SettingsValue, Testimonial, WorkMedia } from "@/lib/site.functions";

// Server-only, self-hosted data store. Replaces the Supabase tables so the
// site runs anywhere with zero external setup: content is kept in a small JSON
// file next to the server (data/store.json) and seeded from the static catalog
// on first run. All file access is wrapped in createServerOnlyFn so it never
// reaches the client bundle. On read-only hosts writes silently fall back to
// in-memory, so the site never breaks.

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
  settings: Record<string, SettingsValue>;
  media: WorkMedia[];
  uploads: UploadedFile[];
};

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
    settings: {},
    media: [],
    uploads: [],
  };
}

const readStoreJson = createServerOnlyFn(async (): Promise<StoreShape | null> => {
  const { existsSync, readFileSync } = await import("node:fs");
  const file = `${process.cwd()}/data/store.json`;
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as StoreShape;
  } catch {
    return null;
  }
});

const writeStoreJson = createServerOnlyFn(async (store: StoreShape): Promise<void> => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  try {
    const dir = `${process.cwd()}/data`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/store.json`, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Read-only environment — keep changes in memory for this process.
  }
});

let cache: StoreShape | null = null;

function normalize(raw: StoreShape): StoreShape {
  const fallback = seed();
  return {
    works: Array.isArray(raw.works) ? raw.works : fallback.works,
    testimonials: Array.isArray(raw.testimonials) ? raw.testimonials : [],
    settings: raw.settings && typeof raw.settings === "object" ? raw.settings : {},
    media: Array.isArray(raw.media) ? raw.media : [],
    uploads: Array.isArray(raw.uploads) ? raw.uploads : [],
  };
}

export async function loadStore(): Promise<StoreShape> {
  if (cache) return cache;
  const raw = await readStoreJson();
  cache = raw ? normalize(raw) : seed();
  return cache;
}

async function persistStore(): Promise<void> {
  if (!cache) return;
  await writeStoreJson(cache);
}

/** Applies a mutation to the store and persists it. */
export async function mutate<T>(fn: (store: StoreShape) => T): Promise<T> {
  const store = await loadStore();
  const result = fn(store);
  await persistStore();
  return result;
}

/** Re-exports so types can be imported from one place. */
export type { Work };
