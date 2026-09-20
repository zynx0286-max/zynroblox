import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "@/lib/require-owner";
import { getStoreBackendStatus, loadStore, mutate } from "@/lib/store";
import { safeExternalUrl } from "@/lib/url";

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export type Testimonial = {
  id: string;
  author: string;
  role: string;
  text: string;
  rating: number;
  imageUrl?: string;
  featured: boolean;
  sortOrder: number;
};

export const listTestimonials = createServerFn({ method: "GET" }).handler(
  async (): Promise<Testimonial[]> => {
    return [...(await loadStore()).testimonials].sort((a, b) => a.sortOrder - b.sortOrder);
  },
);

const testimonialInput = z.object({
  author: z.string().trim().min(1).max(80),
  role: z.string().max(120).default(""),
  text: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5).default(5),
  imageUrl: z.string().max(2000000).default(""),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type TestimonialInput = z.infer<typeof testimonialInput>;

function toTestimonial(data: TestimonialInput, id: string): Testimonial {
  return {
    id,
    author: data.author,
    role: data.role,
    text: data.text,
    rating: data.rating,
    ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
    featured: data.featured,
    sortOrder: data.sortOrder,
  };
}

export const adminListTestimonials = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<Testimonial[]> => {
    return [...(await loadStore()).testimonials].sort((a, b) => a.sortOrder - b.sortOrder);
  });

export const createTestimonial = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => testimonialInput.parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      store.testimonials.push(toTestimonial(data, crypto.randomUUID()));
    });
    return { ok: true as const };
  });

export const updateTestimonial = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    testimonialInput.extend({ id: z.string().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await mutate((store) => {
      const idx = store.testimonials.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Testimonial not found");
      store.testimonials[idx] = toTestimonial(rest, id);
    });
    return { ok: true as const };
  });

export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ id: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      store.testimonials = store.testimonials.filter((t) => t.id !== data.id);
    });
    return { ok: true as const };
  });

/**
 * Moves a testimonial one position up/down by SWAPPING sortOrders with its
 * neighbor. Replaces the old read-edit-rewrite flow that asserted a list
 * lookup (crashing with `!` when the list moved mid-flight) and collided
 * sortOrders on ties. Boundary moves are a no-op.
 */
export const reorderTestimonial = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z.object({ id: z.string().min(1).max(120), direction: z.enum(["up", "down"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    await mutate((store) => {
      const sorted = [...store.testimonials].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((t) => t.id === data.id);
      if (idx === -1) throw new Error("Testimonial not found");
      const swapWith = data.direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= sorted.length) return; // already at the edge
      const current = sorted[idx];
      const neighbor = sorted[swapWith];
      if (!current || !neighbor) return;
      if (neighbor.sortOrder === current.sortOrder) {
        // Legacy ties: renormalize so the swap changes the visible order.
        sorted.forEach((t, i) => {
          t.sortOrder = i;
        });
      }
      const tmp = current.sortOrder;
      current.sortOrder = neighbor.sortOrder;
      neighbor.sortOrder = tmp;
    });
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Site settings (JSON per section)
// ---------------------------------------------------------------------------

export type SettingsValue =
  string | number | boolean | null | SettingsValue[] | { [k: string]: SettingsValue };

export const listSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, SettingsValue>> => {
    return (await loadStore()).settings;
  },
);

/** Owner-only: which persistence backend the server is actually using.
 *  "kv" = durable on Workers. Anything else means admin edits will be lost
 *  on redeploy/restart — the badge in /admin surfaces this. */
export const getPersistenceStatus = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async () => {
    return getStoreBackendStatus();
  });

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z
      .object({
        key: z
          .string()
          .min(1)
          .max(40)
          .regex(/^[a-zA-Z][a-zA-Z0-9]{0,39}$/),
        value: z.unknown(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const value = sanitizeSettingsValue(data.value, 0);
    const json = JSON.stringify(value);
    if (json.length > MAX_SETTINGS_BYTES) {
      throw new Error("This section is too large to save (max ~500 KB)");
    }
    await mutate((store) => {
      store.settings[data.key] = value as SettingsValue;
    });
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Settings sanitization
//
// Previously any JSON could be stored under any key. A malformed save could
// crash public rendering (mergeSettings trusts loose shapes) or quietly bloat
// the KV store toward its limits. Every string that looks like a URL is also
// scheme-checked: `javascript:`/`data:text/html` payloads in editable link
// fields would otherwise become stored XSS the moment a visitor clicks.
// ---------------------------------------------------------------------------

const MAX_SETTINGS_BYTES = 500_000;
const MAX_SETTINGS_DEPTH = 8;

/** Legacy uploads were inline data URLs — keep those media types only. */
const SAFE_DATA_URL =
  /^data:(image\/(png|jpeg|jpg|gif|webp|avif|svg\+xml)|audio\/|video\/)[a-z0-9.+-]*;base64,[a-z0-9+/=]+$/i;

function sanitizeUrlishString(raw: string): string {
  const trimmed = raw.trim();
  // Only strings that LOOK like absolute URLs are scheme-checked; plain copy
  // (sentences, markdown legal text) passes through untouched.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return raw;
  if (SAFE_DATA_URL.test(trimmed)) return trimmed;
  return safeExternalUrl(trimmed) ?? "";
}

function sanitizeSettingsValue(value: unknown, depth: number): unknown {
  if (depth > MAX_SETTINGS_DEPTH) throw new Error("Settings nesting is too deep");
  if (value === null) return null;
  if (typeof value === "string") return sanitizeUrlishString(value);
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (value.length > 500) throw new Error("Too many items in this section");
    return value.map((v) => sanitizeSettingsValue(v, depth + 1));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 200) throw new Error("Too many fields in this section");
    return Object.fromEntries(
      entries.map(([k, v]) => [k.slice(0, 80), sanitizeSettingsValue(v, depth + 1)]),
    );
  }
  return null; // functions/symbols/bigints etc. are not representable
}

// ---------------------------------------------------------------------------
// Work media (image / audio / video attachments)
// ---------------------------------------------------------------------------

export type WorkMedia = {
  id: string;
  workId: string;
  mediaType: "image" | "audio" | "video";
  url: string;
  caption: string;
  sortOrder: number;
};

export const listWorkMedia = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkMedia[]> => {
    return [...(await loadStore()).media].sort((a, b) => a.sortOrder - b.sortOrder);
  },
);

const workMediaInput = z.object({
  workId: z.string().min(1).max(120),
  mediaType: z.enum(["image", "audio", "video"]),
  url: z
    .string()
    .min(1)
    .max(2000000)
    .refine(
      (v) =>
        v.startsWith("/uploads/") || /^https:\/\//i.test(v.trim()) || SAFE_MEDIA_DATA_URL.test(v),
      "Media URLs must be https:// links, /uploads/ paths or inline media data URLs",
    ),
  caption: z.string().max(200).default(""),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const SAFE_MEDIA_DATA_URL = /^data:(image\/|audio\/|video\/)[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i;

export type WorkMediaInput = z.infer<typeof workMediaInput>;

function toWorkMedia(data: WorkMediaInput, id: string): WorkMedia {
  const url =
    data.url.startsWith("/uploads/") || SAFE_MEDIA_DATA_URL.test(data.url)
      ? data.url
      : (safeExternalUrl(data.url) ?? "");
  return {
    id,
    workId: data.workId,
    mediaType: data.mediaType,
    url,
    caption: data.caption,
    sortOrder: data.sortOrder,
  };
}

export const addWorkMedia = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => workMediaInput.parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      store.media.push(toWorkMedia(data, crypto.randomUUID()));
    });
    return { ok: true as const };
  });

export const updateWorkMedia = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    workMediaInput.extend({ id: z.string().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await mutate((store) => {
      const idx = store.media.findIndex((m) => m.id === id);
      if (idx === -1) throw new Error("Media not found");
      store.media[idx] = toWorkMedia(rest, id);
    });
    return { ok: true as const };
  });

export const deleteWorkMedia = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ id: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      store.media = store.media.filter((m) => m.id !== data.id);
    });
    return { ok: true as const };
  });
