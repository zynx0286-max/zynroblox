import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Work } from "@/data/works";

// NOTE: the generated `Database` type in integrations/supabase/types.ts doesn't
// include the tables added in migrations/20260819… (site_settings, testimonials,
// work_media) until types are regenerated, so these go through an untyped client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedDb = any;

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient(url, key, {
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

type TestimonialRow = {
  id: string;
  author: string;
  role: string;
  text: string;
  rating: number;
  image_url: string | null;
  featured: boolean;
  sort_order: number;
};

function toTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    author: row.author,
    role: row.role,
    text: row.text,
    rating: Number(row.rating ?? 5),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    featured: Boolean(row.featured),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export const listTestimonials = createServerFn({ method: "GET" }).handler(
  async (): Promise<Testimonial[]> => {
    const { data, error } = await (publicClient() as UntypedDb)
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as TestimonialRow[]).map(toTestimonial);
  },
);

const testimonialInput = z.object({
  author: z.string().trim().min(1).max(80),
  role: z.string().max(120).default(""),
  text: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5).default(5),
  imageUrl: z.string().max(500).default(""),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type TestimonialInput = z.infer<typeof testimonialInput>;

export const adminListTestimonials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Testimonial[]> => {
    const { data, error } = await (context.supabase as UntypedDb)
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as TestimonialRow[]).map(toTestimonial);
  });

export const createTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => testimonialInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as UntypedDb).from("testimonials").insert({
      author: data.author,
      role: data.role,
      text: data.text,
      rating: data.rating,
      image_url: data.imageUrl || null,
      featured: data.featured,
      sort_order: data.sortOrder,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => testimonialInput.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await (context.supabase as UntypedDb)
      .from("testimonials")
      .update({
        author: rest.author,
        role: rest.role,
        text: rest.text,
        rating: rest.rating,
        image_url: rest.imageUrl || null,
        featured: rest.featured,
        sort_order: rest.sortOrder,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as UntypedDb)
      .from("testimonials")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Site settings (JSON per section)
// ---------------------------------------------------------------------------

export type SettingsValue =
  string | number | boolean | null | SettingsValue[] | { [k: string]: SettingsValue };

export const listSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, SettingsValue>> => {
    const { data, error } = await (publicClient() as UntypedDb).from("site_settings").select("*");
    if (error) throw new Error(error.message);
    const out: Record<string, SettingsValue> = {};
    for (const row of (data ?? []) as { key: string; value: SettingsValue }[]) {
      out[row.key] = row.value;
    }
    return out;
  },
);

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ key: z.string().min(1).max(60), value: z.record(z.string(), z.unknown()) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as UntypedDb)
      .from("site_settings")
      .upsert({ key: data.key, value: data.value }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

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

type WorkMediaRow = {
  id: string;
  work_id: string;
  media_type: "image" | "audio" | "video";
  url: string;
  caption: string;
  sort_order: number;
};

function toWorkMedia(row: WorkMediaRow): WorkMedia {
  return {
    id: row.id,
    workId: row.work_id,
    mediaType: row.media_type ?? "image",
    url: row.url,
    caption: row.caption ?? "",
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export const listWorkMedia = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkMedia[]> => {
    const { data, error } = await (publicClient() as UntypedDb)
      .from("work_media")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as WorkMediaRow[]).map(toWorkMedia);
  },
);

const workMediaInput = z.object({
  workId: z.string().uuid(),
  mediaType: z.enum(["image", "audio", "video"]),
  url: z.string().url().or(z.string().max(10)),
  caption: z.string().max(200).default(""),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type WorkMediaInput = z.infer<typeof workMediaInput>;

export const addWorkMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => workMediaInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as UntypedDb).from("work_media").insert({
      work_id: data.workId,
      media_type: data.mediaType,
      url: data.url,
      caption: data.caption,
      sort_order: data.sortOrder,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateWorkMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => workMediaInput.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await (context.supabase as UntypedDb)
      .from("work_media")
      .update({
        media_type: rest.mediaType,
        url: rest.url,
        caption: rest.caption,
        sort_order: rest.sortOrder,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWorkMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as UntypedDb)
      .from("work_media")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// First-run admin bootstrap
// ---------------------------------------------------------------------------

export const adminCount = createServerFn({ method: "GET" }).handler(async (): Promise<number> => {
  const { data, error } = await (publicClient() as UntypedDb).rpc("admin_count");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
});

// Re-exported helpers used by the public site.
export type { Work };
