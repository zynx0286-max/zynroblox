import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { loadStore, mutate } from "@/lib/store";
import { requireOwner } from "@/lib/require-owner";
import { getReviewHashSecret, getAdminPassword } from "@/lib/owner-session";
import { safeExternalUrl } from "@/lib/url";

// ---------------------------------------------------------------------------
// Reviews
//
// Public client reviews. Rows live in the self-hosted JSON store
// (data/store.json); no external service required. Submissions publish
// instantly so writers see their review right away; anti-spam is strict:
// ONE review per IP (persisted hash) and ONE per email, ever — plus a
// per-IP burst rate limit and link heuristic so a bot can't flood or crash
// the site. The owner can unverify or delete anything from /admin (deleting
// keeps the IP blocked so the same bot can't just resubmit).
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

// `z.string().url()` happily accepts `javascript:…` — a stored-XSS vector
// once rendered into <img src>/<a href>. Screenshots must be genuine images
// served over HTTPS.
const httpsImageUrl = z
  .string()
  .max(2000)
  .refine((v) => /^https:\/\//i.test(v.trim()), "Screenshot URLs must be https:// links");

export const reviewInput = z.object({
  authorName: z.string().trim().min(2).max(100),
  authorEmail: z.string().trim().email().max(200),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(5).max(200),
  content: z.string().trim().min(20).max(5000),
  screenshotUrls: z.array(httpsImageUrl).max(8).default([]),
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

// Instant-publish bot guards (the old manual-approval gate is gone).
// Burst guard only — the real one-review-per-IP rule is persisted below.
const REVIEW_IP_LIMIT = 5;
const REVIEW_IP_WINDOW_MS = 10 * 60 * 1000;
const reviewIpHits = new Map<string, number[]>();

/**
 * One-way hash of a submitter IP so the store never keeps raw IPs.
 *
 * HMAC-SHA256 keyed with REVIEW_HASH_SECRET (falling back to the admin
 * password, then a dev constant). The old djb2 + known-salt scheme was
 * trivially reversible by brute-forcing the IPv4 space, which contradicted
 * the privacy policy — HMAC with a server-only key fixes that.
 */
async function hashReviewIp(ip: string): Promise<string> {
  const secret = (await getReviewHashSecret()) || (await getAdminPassword());
  const keyMaterial = `zyn-review-hash:${secret || "local-dev-only"}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyMaterial),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(ip.trim().toLowerCase()));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `iph_${b64}`;
}

/**
 * Legacy djb2 hash kept ONLY so existing entries still block resubmissions.
 * Matched hashes are upgraded to HMAC on the spot and the legacy form is
 * never written for new reviews.
 */
function legacyHashReviewIp(ip: string): string {
  const salted = `zyn-review-v1:${ip.trim().toLowerCase()}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < salted.length; i++) {
    const c = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ (c + 31), 16777619);
  }
  return `ip_${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}

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
    const ipHash = ip === "unknown" ? null : await hashReviewIp(ip);
    const legacyIpHash = ip === "unknown" ? null : legacyHashReviewIp(ip);
    // Defence in depth: the validator already requires https://, this also
    // drops anything unexpected that slips through (e.g. legacy rows).
    const screenshotUrls = data.screenshotUrls
      .map((u) => safeExternalUrl(u))
      .filter((u): u is string => !!u);

    return mutate((store) => {
      // ONE review per email, ever.
      const emailUsed = store.reviews.some(
        (r) => r.authorEmail.toLowerCase() === data.authorEmail.toLowerCase(),
      );
      if (emailUsed) {
        throw new Error(
          "This email has already submitted a review. Message me on Discord to update it.",
        );
      }
      // ONE review per IP / device network, ever (persisted — survives restarts
      // and deploys, unlike the in-memory burst guard above). Legacy hashes
      // are upgraded in place to the HMAC form.
      if (ipHash) {
        const ips = store.reviewIps ?? (store.reviewIps = []);
        const legacyIdx = legacyIpHash ? ips.indexOf(legacyIpHash) : -1;
        if (legacyIdx !== -1) ips[legacyIdx] = ipHash;
        if (ips.includes(ipHash)) {
          throw new Error(
            "A review has already been submitted from this device or network. Message me on Discord if you need it changed.",
          );
        }
      }
      const review: Review = {
        id: `review-${crypto.randomUUID()}`,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        rating: data.rating,
        title: data.title,
        content: data.content,
        screenshotUrls,
        ...(data.projectRef ? { projectRef: data.projectRef } : {}),
        featured: false,
        // Publishes instantly so the writer sees it right away for everyone.
        verified: true,
        createdAt: now,
        updatedAt: now,
      };
      store.reviews.push(review);
      if (ipHash) {
        const ips = store.reviewIps ?? (store.reviewIps = []);
        if (!ips.includes(ipHash)) ips.push(ipHash);
      }
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
      const updates = { ...data.updates };
      if (updates.screenshotUrls) {
        updates.screenshotUrls = updates.screenshotUrls
          .map((u) => safeExternalUrl(u))
          .filter((u): u is string => !!u);
      }
      Object.assign(review, updates, { updatedAt: new Date().toISOString() });
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

export const unverifyReview = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<Review> => {
    return mutate((store) => {
      const review = store.reviews.find((r) => r.id === data.id);
      if (!review) throw new Error("Review not found");
      review.verified = false;
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
      // NOTE: the submitter's IP hash stays in store.reviewIps, so a deleted
      // spammer can't immediately resubmit from the same network.
    });
    return { success: true };
  });
