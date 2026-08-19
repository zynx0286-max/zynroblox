import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BadgeCheck, Loader2, Star, Trash2 } from "lucide-react";
import { captureError } from "@/lib/sentry";
import {
  adminListReviews,
  deleteReview,
  toggleReviewFeatured,
  verifyReview,
  type Review,
} from "@/lib/reviews.functions";

export function ReviewsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListReviews);
  const verify = useServerFn(verifyReview);
  const toggleFeatured = useServerFn(toggleReviewFeatured);
  const remove = useServerFn(deleteReview);

  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => list(),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  const onError = (err: unknown) => {
    captureError(err, { area: "admin" });
    setError(err instanceof Error ? err.message : "Something went wrong");
  };

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verify({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });
  const featuredMutation = useMutation({
    mutationFn: (id: string) => toggleFeatured({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });

  const listItems = query.data ?? [];
  const pending = listItems.filter((r) => !r.verified);

  return (
    <>
      {error ? (
        <p className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">
          Reviews submitted from the site start unverified and only show publicly after you approve
          them.{" "}
          {pending.length > 0 ? (
            <span className="font-semibold text-primary">{pending.length} awaiting review.</span>
          ) : null}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {query.isPending ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : null}

        {listItems.map((r: Review) => (
          <div key={r.id} className="glass-card rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-40 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-sm font-semibold">{r.authorName}</p>
                  <span className="flex items-center gap-0.5 text-primary">
                    {Array.from({ length: r.rating }, (_, n) => (
                      <Star key={n} className="size-3 fill-primary" />
                    ))}
                  </span>
                  {r.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.6rem] tracking-wider text-emerald-500 uppercase">
                      <BadgeCheck className="size-3" /> Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] tracking-wider text-amber-500 uppercase">
                      Pending
                    </span>
                  )}
                  {r.featured ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.6rem] tracking-wider text-primary uppercase">
                      Featured
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.projectRef ? r.projectRef.replace(/-/g, " ") : "General review"} ·{" "}
                  {r.createdAt.slice(0, 10)}
                </p>
                <p className="mt-2 font-display text-sm font-semibold text-foreground">{r.title}</p>
                <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                  {r.content}
                </p>
                {r.screenshotUrls.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.screenshotUrls.length} screenshot{r.screenshotUrls.length > 1 ? "s" : ""}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {!r.verified ? (
                  <button
                    onClick={() => verifyMutation.mutate(r.id)}
                    disabled={verifyMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3.5 py-2 font-display text-xs text-emerald-500 disabled:opacity-60"
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <BadgeCheck className="size-3.5" />
                    )}
                    Approve
                  </button>
                ) : null}
                <button
                  onClick={() => featuredMutation.mutate(r.id)}
                  disabled={featuredMutation.isPending}
                  className="rounded-full border border-border px-3.5 py-2 font-display text-xs disabled:opacity-60"
                >
                  {r.featured ? "Unfeature" : "Feature"}
                </button>
                <button
                  aria-label={`Delete review from ${r.authorName}`}
                  onClick={() => {
                    if (window.confirm(`Delete review from "${r.authorName}"?`))
                      deleteMutation.mutate(r.id);
                  }}
                  className="rounded-full border border-destructive/50 p-2 text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {listItems.length === 0 && !query.isPending ? (
          <p className="rounded-2xl border border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No reviews yet. Reviews submitted from the site will appear here.
          </p>
        ) : null}
      </div>
    </>
  );
}
