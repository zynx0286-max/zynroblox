import { listWorks, type DbWork } from "@/lib/works.functions";
import {
  listTestimonials,
  listSiteSettings,
  listWorkMedia,
  type Testimonial,
  type WorkMedia,
} from "@/lib/site.functions";
import { mergeSettings, DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { works as staticWorks } from "@/data/works";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** Public works: the Supabase table is seeded with the full catalog, so DB wins.
 *  Image URLs from the DB still point at the old Lovable CDN, so we override
 *  them with the self-hosted assets bundled by Vite. */
export async function getPublicWorks(): Promise<DbWork[]> {
  const db = await safe(() => listWorks(), null);
  if (db && db.length) {
    const staticImageBySlug = new Map(
      staticWorks.filter((w) => w.image).map((w) => [w.slug, w.image]),
    );
    return db.map((w) => {
      const img = staticImageBySlug.get(w.slug);
      return img ? { ...w, image: img } : w;
    });
  }
  return staticWorks.map((w, i) => ({ ...w, id: `static-${i}`, sortOrder: i }));
}

export async function getPublicTestimonials(): Promise<Testimonial[]> {
  return safe(() => listTestimonials(), []);
}

export async function getPublicSettings(): Promise<SiteSettings> {
  const stored = await safe(() => listSiteSettings(), null);
  return mergeSettings(stored ?? {});
}

export async function getPublicMedia(): Promise<WorkMedia[]> {
  return safe(() => listWorkMedia(), []);
}

export type PublicSiteData = {
  works: DbWork[];
  testimonials: Testimonial[];
  settings: SiteSettings;
  media: WorkMedia[];
};

export async function getPublicSiteData(): Promise<PublicSiteData> {
  const [works, testimonials, settings, media] = await Promise.all([
    getPublicWorks(),
    getPublicTestimonials(),
    getPublicSettings(),
    getPublicMedia(),
  ]);
  return { works, testimonials, settings, media };
}

export { DEFAULT_SETTINGS };
