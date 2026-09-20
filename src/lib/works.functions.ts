import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "@/lib/require-owner";
import { loadStore, mutate } from "@/lib/store";
import type { Work } from "@/data/works";
import { safeExternalUrl } from "@/lib/url";

export type DbWork = Work & { id: string; sortOrder: number };

function sorted(works: DbWork[]): DbWork[] {
  return [...works].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Public: every project, ordered for display. */
export const listWorks = createServerFn({ method: "GET" }).handler(async (): Promise<DbWork[]> => {
  return sorted((await loadStore()).works);
});

// `z.string().url()` accepts `javascript:` URLs — every work link/image ends
// up in an href/src attribute, so only genuine https URLs (or empty) pass.
const httpsUrlOrEmpty = z
  .string()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\//i.test(v.trim()), "Use an https:// URL (or leave empty)")
  .default("");

export const workInput = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  title: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  role: z.string().max(120).default(""),
  description: z.string().max(2000).default(""),
  tags: z.array(z.string().max(40)).max(12).default([]),
  href: httpsUrlOrEmpty,
  linkLabel: z.string().max(60).default(""),
  imageUrl: httpsUrlOrEmpty,
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type WorkInput = z.infer<typeof workInput>;

function toWork(data: WorkInput, id: string): DbWork {
  // Server-side re-check (validator already enforces https) so legacy rows
  // and programmatic callers can't smuggle unsafe schemes through.
  const href = safeExternalUrl(data.href);
  const image = safeExternalUrl(data.imageUrl);
  return {
    id,
    slug: data.slug,
    title: data.title,
    category: data.category as Work["category"],
    role: data.role,
    description: data.description,
    tags: data.tags,
    ...(href ? { href } : {}),
    ...(data.linkLabel ? { linkLabel: data.linkLabel } : {}),
    ...(image ? { image } : {}),
    featured: data.featured,
    sortOrder: data.sortOrder,
  };
}

/** Admin: full list (same data, but gated by the owner session). */
export const adminListWorks = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<DbWork[]> => {
    return sorted((await loadStore()).works);
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async () => {
    return true as const;
  });

export const createWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => workInput.parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      if (store.works.some((w) => w.slug === data.slug)) {
        throw new Error("A project with this slug already exists");
      }
      store.works.push(toWork(data, crypto.randomUUID()));
    });
    return { ok: true as const };
  });

export const updateWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => workInput.extend({ id: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await mutate((store) => {
      const idx = store.works.findIndex((w) => w.id === id);
      if (idx === -1) throw new Error("Project not found");
      const slugTaken = store.works.some((w) => w.id !== id && w.slug === rest.slug);
      if (slugTaken) throw new Error("A project with this slug already exists");
      store.works[idx] = toWork(rest, id);
    });
    return { ok: true as const };
  });

export const deleteWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ id: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      store.works = store.works.filter((w) => w.id !== data.id);
    });
    return { ok: true as const };
  });

/**
 * Moves a work one position up/down in display order by SWAPPING sortOrders
 * with its neighbor. The previous set-a-number approach collided whenever two
 * entries shared a sortOrder (ties made the arrows no-ops) and drifted out of
 * sync with the visible list. Boundary moves are a no-op, not an error.
 */
export const reorderWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z.object({ id: z.string().min(1).max(120), direction: z.enum(["up", "down"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    await mutate((store) => {
      const sorted = [...store.works].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((w) => w.id === data.id);
      if (idx === -1) throw new Error("Project not found");
      const swapWith = data.direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= sorted.length) return; // already at the edge
      const current = sorted[idx];
      const neighbor = sorted[swapWith];
      if (!current || !neighbor) return;
      // Legacy rows can share a sortOrder — renormalize first so the swap
      // genuinely changes the visible order.
      if (neighbor.sortOrder === current.sortOrder) {
        sorted.forEach((w, i) => {
          w.sortOrder = i;
        });
      }
      const tmp = current.sortOrder;
      current.sortOrder = neighbor.sortOrder;
      neighbor.sortOrder = tmp;
    });
    return { ok: true as const };
  });
