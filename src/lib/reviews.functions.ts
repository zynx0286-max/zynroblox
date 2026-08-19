import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loadStore, mutate } from "@/lib/store";
import { requireOwner } from "@/lib/require-owner";

// ---------------------------------------------------------------------------
// Reviews
//
// Public client reviews with an admin verification workflow. Rows live in the
// self-hosted JSON store (data/store.json); no external service required.
// Public submissions start unverified and only appear once an admin verifies
// them, so spam can never reach the site.
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

const reviewFilter = z
  .object({
    projectRef: z.string().trim().min(1).max(120).optional(),
  })
  .partial();

export const listReviews = createServerFn({ method: "GET" })
  .validator((data: unknown) => reviewFilter.parse(data ?? {}))
  .handler(async ({ data }): Promise<Review[]> => {
    const all = [...(await loadStore()).reviews]
      .filter((r) => r.verified)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return data.projectRef
      ? all.filter((r) => r.projectRef === data.projectRef).slice(0, 50)
      : all.slice(0, 50);
  });

const MAX_REVIEWS_PER_EMAIL_PER_DAY = 5;

export const createReview = createServerFn({ method: "POST" })
  .validator((data: unknown) => reviewInput.parse(data))
  .handler(async ({ data }): Promise<Review> => {
    const now = new Date().toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

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
        verified: false,
        createdAt: now,
        updatedAt: now,
      };
      store.reviews.push(review);
      return review;
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
