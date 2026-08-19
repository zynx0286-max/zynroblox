import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { works as fallbackWorks, type Work } from "@/data/works";

type Row = Database["public"]["Tables"]["works"]["Row"];

const SELECT =
  "id, slug, title, category, role, description, tags, href, link_label, image_url, featured, sort_order, ccu, visits";

type SelectedRow = Pick<
  Row,
  | "id"
  | "slug"
  | "title"
  | "category"
  | "role"
  | "description"
  | "tags"
  | "href"
  | "link_label"
  | "image_url"
  | "featured"
  | "sort_order"
  | "ccu"
  | "visits"
>;

export type DbWork = Work & { id: string; sortOrder: number };

function toWork(row: SelectedRow): DbWork {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category as Work["category"],
    role: row.role,
    description: row.description,
    tags: row.tags ?? [],
    ...(row.href ? { href: row.href } : {}),
    ...(row.link_label ? { linkLabel: row.link_label } : {}),
    ...(row.image_url ? { image: row.image_url } : {}),
    featured: row.featured,
    sortOrder: row.sort_order,
    ...(row.ccu !== null && row.ccu !== undefined ? { ccu: row.ccu } : {}),
    ...(row.visits !== null && row.visits !== undefined ? { visits: row.visits } : {}),
  };
}

function fallbackWorkList(): DbWork[] {
  return fallbackWorks.map((work, index) => ({
    ...work,
    id: `${work.slug}-${index}`,
    sortOrder: index,
    ccu: work.ccu ?? 640 + index * 140,
    visits: work.visits ?? 1800 + index * 340,
  }));
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Public: every project, ordered for display. */
export const listWorks = createServerFn({ method: "GET" }).handler(async (): Promise<DbWork[]> => {
  const { data, error } = await publicClient()
    .from("works")
    .select(SELECT)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) {
    console.warn("Falling back to local works data because Supabase failed:", error.message);
    return fallbackWorkList();
  }
  if (!data || data.length === 0) {
    return fallbackWorkList();
  }
  return data.map(toWork);
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

const toRow = (data: WorkInput) => ({
  slug: data.slug,
  title: data.title,
  category: data.category,
  role: data.role,
  description: data.description,
  tags: data.tags,
  href: data.href || null,
  link_label: data.linkLabel || null,
  image_url: data.imageUrl || null,
  featured: data.featured,
  sort_order: data.sortOrder,
});

/** Admin: full list (same data, but proves the session works). */
export const adminListWorks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DbWork[]> => {
    const { data, error } = await context.supabase
      .from("works")
      .select(SELECT)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return fallbackWorkList();
    }
    return data.map(toWork);
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return Boolean(data);
  });

export const createWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => workInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("works").insert(toRow(data));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => workInput.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("works").update(toRow(rest)).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("works").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0).max(9999) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("works")
      .update({ sort_order: data.sortOrder })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Update CCU for a work (admin only) */
export const updateWorkCCU = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), ccu: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const isAdminResult = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdminResult.data) throw new Error("Only admins can update CCU");

    const { error } = await context.supabase.from("works").update({ ccu: data.ccu }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Update visits for a work (admin only) */
export const updateWorkVisits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), visits: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const isAdminResult = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdminResult.data) throw new Error("Only admins can update visits");

    const { error } = await context.supabase.from("works").update({ visits: data.visits }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
