import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

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

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    authorName: row.author_name,
    authorEmail: row.author_email,
    rating: row.rating,
    title: row.title,
    content: row.content,
    screenshotUrls: row.screenshot_urls ?? [],
    projectRef: row.project_ref ?? undefined,
    featured: row.featured,
    verified: row.verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const reviewSchema = z.object({
  authorName: z.string().min(2).max(100),
  authorEmail: z.string().email(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(5).max(200),
  content: z.string().min(20).max(5000),
  screenshotUrls: z.array(z.string().url()).default([]),
  projectRef: z.string().optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export const listReviews = createServerFn("GET /api/reviews")
  .validator(() => reviewSchema.pick({ projectRef: true }).partial())
  .handler(async (data) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    );

    let query = supabase
      .from("reviews")
      .select("*")
      .eq("verified", true)
      .order("created_at", { ascending: false });

    if (data?.projectRef) {
      query = query.eq("project_ref", data.projectRef);
    }

    const { data: rows, error } = await query.limit(50);
    if (error) throw error;
    return (rows ?? []).map(toReview);
  });

export const adminListReviews = createServerFn("GET /api/admin/reviews").handler(async () => {
  const { user } = await requireSupabaseAuth();
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
  );

  // Check admin permission via has_role function
  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Unauthorized");
  }

  const { data: rows, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (rows ?? []).map(toReview);
});

export const createReview = createServerFn("POST /api/reviews")
  .validator((data: unknown) => reviewSchema.parse(data))
  .handler(async (input) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    );

    // Rate limit: max 5 reviews per email per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("author_email", input.authorEmail)
      .gte("created_at", today.toISOString());

    if (countError) throw countError;
    if ((count ?? 0) >= 5) {
      throw new Error("Too many reviews from this email today. Try again tomorrow.");
    }

    const { data: row, error } = await supabase
      .from("reviews")
      .insert({
        author_name: input.authorName,
        author_email: input.authorEmail,
        rating: input.rating,
        title: input.title,
        content: input.content,
        screenshot_urls: input.screenshotUrls,
        project_ref: input.projectRef,
        verified: false, // Manual verification required
      })
      .select()
      .single();

    if (error) throw error;
    return toReview(row);
  });

export const updateReview = createServerFn("POST /api/admin/reviews/:id")
  .validator((data: unknown) => {
    return {
      id: z.string().uuid().parse((data as any).id),
      updates: reviewSchema.partial().parse((data as any).updates ?? {}),
    };
  })
  .handler(async ({ id, updates }) => {
    const { user } = await requireSupabaseAuth();
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    );

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Unauthorized");

    const updatePayload: Record<string, unknown> = {};
    if (updates.authorName !== undefined) updatePayload.author_name = updates.authorName;
    if (updates.rating !== undefined) updatePayload.rating = updates.rating;
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.content !== undefined) updatePayload.content = updates.content;
    if (updates.screenshotUrls !== undefined) updatePayload.screenshot_urls = updates.screenshotUrls;
    if (updates.projectRef !== undefined) updatePayload.project_ref = updates.projectRef;

    const { data: row, error } = await supabase
      .from("reviews")
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return toReview(row);
  });

export const verifyReview = createServerFn("POST /api/admin/reviews/:id/verify").handler(
  async ({ id }: { id: string }) => {
    const { user } = await requireSupabaseAuth();
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    );

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Unauthorized");

    const { data: row, error } = await supabase
      .from("reviews")
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return toReview(row);
  },
);

export const deleteReview = createServerFn("DELETE /api/admin/reviews/:id").handler(
  async ({ id }: { id: string }) => {
    const { user } = await requireSupabaseAuth();
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    );

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Unauthorized");

    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) throw error;
    return { success: true };
  },
);

export const toggleReviewFeatured = createServerFn(
  "POST /api/admin/reviews/:id/toggle-featured",
).handler(async ({ id }: { id: string }) => {
  const { user } = await requireSupabaseAuth();
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
  );

  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (!isAdmin) throw new Error("Unauthorized");

  // Get current state
  const { data: review, error: fetchError } = await supabase
    .from("reviews")
    .select("featured")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const { data: row, error } = await supabase
    .from("reviews")
    .update({ featured: !review.featured, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toReview(row);
});
