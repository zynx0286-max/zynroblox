import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { loadStore, mutate } from "@/lib/store";
import { requireOwner } from "@/lib/require-owner";

// ---------------------------------------------------------------------------
// Reviews
//
// Public client reviews. Rows live in the self-hosted JSON store
// (data/store.json); no external service required. Submissions publish
// instantly so writers see their review right away; lightweight bot guards
// (per-IP rate limit + link heuristic) plus the per-email daily cap keep spam
// out, and the owner can still unverify or delete anything from /admin.
// ---------------------------------------------------------------------------

export type Review = {
  id: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string;
  content: string;
  screenshotUrls: string[];
  projectRef?: string;
  featured: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
};

export const reviewInput = z.object({
  authorName: z.string().trim().min(2).max(100),
  authorEmail: z.string().trim().email().max(200),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(5).max(200),
  content: z.string().trim().min(20).max(5000),
  screenshotUrls: z.array(z.string().url()).max(8).default([]),
  projectRef: z.string().trim().min(1).max(120).optional(),
});

export type ReviewInput = z.infer<typeof reviewInput>;

/** Public-safe review — `authorEmail` is private and never leaves the server
 *  except through owner-gated admin functions. */
export type PublicReview = Omit<Review, "authorEmail">;

function toPublicReview(review: Review): PublicReview {
  const { authorEmail: _email, ...pub } = review;
  return pub;
}

const reviewFilter = z
  .object({
    projectRef: z.string().trim().min(1).max(120).optional(),
  })
  .partial();

export const listReviews = createServerFn({ method: "GET" })
  .validator((data: unknown) => reviewFilter.parse(data ?? {}))
  .handler(async ({ data }): Promise<PublicReview[]> => {
    const all = [...(await loadStore()).reviews]
      .filter((r) => r.verified)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const scoped = data.projectRef
      ? all.filter((r) => r.projectRef === data.projectRef).slice(0, 50)
      : all.slice(0, 50);
    return scoped.map(toPublicReview);
  });

const MAX_REVIEWS_PER_EMAIL_PER_DAY = 5;

// Instant-publish bot guards (the old manual-approval gate is gone).
const REVIEW_IP_LIMIT = 5;
const REVIEW_IP_WINDOW_MS = 10 * 60 * 1000;
const reviewIpHits = new Map<string, number[]>();

function reviewIpLimited(key: string) {
  const now = Date.now();
  const recent = (reviewIpHits.get(key) ?? []).filter((t) => now - t < REVIEW_IP_WINDOW_MS);
  recent.push(now);
  reviewIpHits.set(key, recent);
  if (reviewIpHits.size > 500) {
    for (const [k, v] of reviewIpHits)
      if (!v.some((t) => now - t < REVIEW_IP_WINDOW_MS)) reviewIpHits.delete(k);
  }
  return recent.length > REVIEW_IP_LIMIT;
}

function looksLikeReviewSpam(content: string, authorName: string) {
  const links = (content.match(/https?:\/\//gi) ?? []).length;
  if (links > 1) return true;
  if (/\b(seo services|crypto|casino|viagra|backlinks|forex|loan offer)\b/i.test(content)) {
    return true;
  }
  if (
    authorName.length > 4 &&
    authorName === authorName.toUpperCase() &&
    /\d{3,}/.test(authorName)
  ) {
    return true;
  }
  return false;
}

export const createReview = createServerFn({ method: "POST" })
  .validator((data: unknown) => reviewInput.parse(data))
  .handler(async ({ data }): Promise<PublicReview> => {
    const now = new Date().toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    if (reviewIpLimited(ip)) {
      throw new Error("Too many reviews from this connection. Try again later.");
    }
    if (looksLikeReviewSpam(data.content, data.authorName)) {
      throw new Error("This review was flagged as spam. Please reach me on Discord instead.");
    }

    return mutate((store) => {
      const fromToday = store.reviews.filter(
        (r) =>
          r.authorEmail.toLowerCase() === data.authorEmail.toLowerCase() && r.createdAt >= todayIso,
      );
      if (fromToday.length >= MAX_REVIEWS_PER_EMAIL_PER_DAY) {
        throw new Error("Too many reviews from this email today. Try again tomorrow.");
      }
      const review: Review = {
        id: `review-${crypto.randomUUID()}`,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        rating: data.rating,
        title: data.title,
        content: data.content,
        screenshotUrls: data.screenshotUrls,
        ...(data.projectRef ? { projectRef: data.projectRef } : {}),
        featured: false,
        // Publishes instantly so the writer sees it right away for everyone.
        verified: true,
        createdAt: now,
        updatedAt: now,
      };
      store.reviews.push(review);
      return toPublicReview(review);
    });
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<Review[]> => {
    return [...(await loadStore()).reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

export const updateReview = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().min(1),
        updates: reviewInput.partial(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<Review> => {
    return mutate((store) => {
      const review = store.reviews.find((r) => r.id === data.id);
      if (!review) throw new Error("Review not found");
      Object.assign(review, data.updates, { updatedAt: new Date().toISOString() });
      return review;
    });
  });

export const verifyReview = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<Review> => {
    return mutate((store) => {
      const review = store.reviews.find((r) => r.id === data.id);
      if (!review) throw new Error("Review not found");
      review.verified = true;
      review.updatedAt = new Date().toISOString();
      return review;
    });
  });

export const toggleReviewFeatured = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<Review> => {
    return mutate((store) => {
      const review = store.reviews.find((r) => r.id === data.id);
      if (!review) throw new Error("Review not found");
      review.featured = !review.featured;
      review.updatedAt = new Date().toISOString();
      return review;
    });
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ success: true }> => {
    await mutate((store) => {
      store.reviews = store.reviews.filter((r) => r.id !== data.id);
    });
    return { success: true };
  });
