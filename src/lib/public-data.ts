import { listWorks, type DbWork } from "@/lib/works.functions";
import {
  listTestimonials,
  listSiteSettings,
  listWorkMedia,
  type Testimonial,
  type WorkMedia,
} from "@/lib/site.functions";
import { listReviews, type Review } from "@/lib/reviews.functions";
import { mergeSettings, DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { works as staticWorks } from "@/data/works";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** Public works. The store is seeded from the static catalog, so it always has
 *  content; custom images set by the owner win, otherwise we fall back to the
 *  bundled static thumbnail for each slug. */
export async function getPublicWorks(): Promise<DbWork[]> {
  const db = await safe(() => listWorks(), null);
  if (db && db.length) {
    const staticImageBySlug = new Map(
      staticWorks.filter((w) => w.image).map((w) => [w.slug, w.image]),
    );
    return db.map((w) => {
      const img = staticImageBySlug.get(w.slug);
      return img && !w.image ? { ...w, image: img } : w;
    });
  }
  return staticWorks.map((w, i) => ({ ...w, id: `static-${i}`, sortOrder: i }));
}

export async function getPublicTestimonials(): Promise<Testimonial[]> {
  return safe(() => listTestimonials(), []);
}

export async function getPublicReviews(): Promise<Review[]> {
  return safe(() => listReviews(), []);
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
  reviews: Review[];
  settings: SiteSettings;
  media: WorkMedia[];
};

export async function getPublicSiteData(): Promise<PublicSiteData> {
  const [works, testimonials, reviews, settings, media] = await Promise.all([
    getPublicWorks(),
    getPublicTestimonials(),
    getPublicReviews(),
    getPublicSettings(),
    getPublicMedia(),
  ]);
  return { works, testimonials, reviews, settings, media };
}

export { DEFAULT_SETTINGS };
