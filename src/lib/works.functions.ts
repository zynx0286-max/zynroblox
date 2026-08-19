import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "@/lib/require-owner";
import { loadStore, mutate } from "@/lib/store";
import type { Work } from "@/data/works";

export type DbWork = Work & { id: string; sortOrder: number };

function sorted(works: DbWork[]): DbWork[] {
  return [...works].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Public: every project, ordered for display. */
export const listWorks = createServerFn({ method: "GET" }).handler(async (): Promise<DbWork[]> => {
  return sorted((await loadStore()).works);
});

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
  href: z.string().url().or(z.literal("")).default(""),
  linkLabel: z.string().max(60).default(""),
  imageUrl: z.string().url().or(z.literal("")).default(""),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type WorkInput = z.infer<typeof workInput>;

function toWork(data: WorkInput, id: string): DbWork {
  return {
    id,
    slug: data.slug,
    title: data.title,
    category: data.category as Work["category"],
    role: data.role,
    description: data.description,
    tags: data.tags,
    ...(data.href ? { href: data.href } : {}),
    ...(data.linkLabel ? { linkLabel: data.linkLabel } : {}),
    ...(data.imageUrl ? { image: data.imageUrl } : {}),
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

export const reorderWork = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z
      .object({ id: z.string().min(1).max(120), sortOrder: z.number().int().min(0).max(9999) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await mutate((store) => {
      const w = store.works.find((x) => x.id === data.id);
      if (w) w.sortOrder = data.sortOrder;
    });
    return { ok: true as const };
  });
