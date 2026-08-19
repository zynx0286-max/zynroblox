import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "@/lib/require-owner";
import { loadStore, mutate } from "@/lib/store";

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

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z.object({ key: z.string().min(1).max(60), value: z.unknown() }).parse(data),
  )
  .handler(async ({ data }) => {
    await mutate((store) => {
      store.settings[data.key] = data.value as SettingsValue;
    });
    return { ok: true as const };
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

export const listWorkMedia = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkMedia[]> => {
    return [...(await loadStore()).media].sort((a, b) => a.sortOrder - b.sortOrder);
  },
);

const workMediaInput = z.object({
  workId: z.string().min(1).max(120),
  mediaType: z.enum(["image", "audio", "video"]),
  url: z.string().min(1).max(2000000),
  caption: z.string().max(200).default(""),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type WorkMediaInput = z.infer<typeof workMediaInput>;

function toWorkMedia(data: WorkMediaInput, id: string): WorkMedia {
  return {
    id,
    workId: data.workId,
    mediaType: data.mediaType,
    url: data.url,
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
