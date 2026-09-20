import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, Loader2, Pencil, Star, Trash2, X } from "lucide-react";
import { captureError } from "@/lib/sentry";
import {
  adminListReviews,
  deleteReview,
  toggleReviewFeatured,
  unverifyReview,
  updateReview,
  verifyReview,
  type Review,
} from "@/lib/reviews.functions";

type EditState = {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  content: string;
  projectRef: string;
  screenshotUrls: string;
};

export function ReviewsAdmin() {
  const qc = useQueryClient();
  const router = useRouter();
  const list = useServerFn(adminListReviews);
  const verify = useServerFn(verifyReview);
  const unverify = useServerFn(unverifyReview);
  const toggleFeatured = useServerFn(toggleReviewFeatured);
  const remove = useServerFn(deleteReview);
  const update = useServerFn(updateReview);

  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);

  const query = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => list(),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    // Public pages read via route loaders — refetch them so edits show live.
    void router.invalidate();
  };
  const onError = (err: unknown) => {
    captureError(err, { area: "admin" });
    setError(err instanceof Error ? err.message : "Something went wrong");
  };

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verify({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });
  const unverifyMutation = useMutation({
    mutationFn: (id: string) => unverify({ data: { id } }),
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
  const editMutation = useMutation({
    mutationFn: (e: EditState) =>
      update({
        data: {
          id: e.id,
          updates: {
            authorName: e.authorName,
            rating: e.rating,
            title: e.title,
            content: e.content,
            ...(e.projectRef.trim() ? { projectRef: e.projectRef.trim() } : {}),
            screenshotUrls: e.screenshotUrls
              .split(/[\s,]+/)
              .map((u) => u.trim())
              .filter((u) => /^https:\/\//i.test(u))
              .slice(0, 8),
          },
        },
      }),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError,
  });

  const listItems = query.data ?? [];
  const pending = listItems.filter((r) => !r.verified);
  const field =
    "mt-1.5 w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm outline-none focus:border-primary/60";
  const label = "font-display text-[0.68rem] tracking-wider text-muted-foreground uppercase";

  return (
    <>
      {error ? (
        <p className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">
          Reviews publish instantly so writers see them right away. Hide spam with Unpublish, fix
          typos with Edit, or remove it permanently with delete.{" "}
          {pending.length > 0 ? (
            <span className="font-semibold text-primary">{pending.length} unpublished.</span>
          ) : null}
        </p>
      </div>

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate(editing);
          }}
          className="glass-card mt-6 rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Edit review</h3>
            <button type="button" onClick={() => setEditing(null)} aria-label="Close editor">
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <span className={label}>Author name</span>
              <input
                required
                minLength={2}
                maxLength={100}
                className={field}
                value={editing.authorName}
                onChange={(e) => setEditing({ ...editing, authorName: e.target.value })}
              />
            </div>
            <div>
              <span className={label}>Project</span>
              <input
                maxLength={120}
                className={field}
                value={editing.projectRef}
                onChange={(e) => setEditing({ ...editing, projectRef: e.target.value })}
              />
            </div>
            <div>
              <span className={label}>Rating</span>
              <div className="mt-1.5 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} stars`}
                    onClick={() => setEditing({ ...editing, rating: n })}
                  >
                    <Star
                      className={`size-6 ${n <= editing.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>Title</span>
              <input
                required
                minLength={5}
                maxLength={200}
                className={field}
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <span className={label}>Content</span>
              <textarea
                required
                rows={4}
                minLength={20}
                maxLength={5000}
                className={`${field} resize-none`}
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <span className={label}>Screenshot links (https://, comma separated)</span>
              <input
                className={field}
                value={editing.screenshotUrls}
                onChange={(e) => setEditing({ ...editing, screenshotUrls: e.target.value })}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={editMutation.isPending}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {editMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </button>
        </form>
      ) : null}

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
                {r.verified ? (
                  <button
                    onClick={() => unverifyMutation.mutate(r.id)}
                    disabled={unverifyMutation.isPending}
                    className="rounded-full border border-amber-500/50 px-3.5 py-2 font-display text-xs text-amber-500 disabled:opacity-60"
                  >
                    Unpublish
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
                  aria-label={`Edit review from ${r.authorName}`}
                  onClick={() =>
                    setEditing({
                      id: r.id,
                      authorName: r.authorName,
                      rating: r.rating,
                      title: r.title,
                      content: r.content,
                      projectRef: r.projectRef ?? "",
                      screenshotUrls: r.screenshotUrls.join(", "),
                    })
                  }
                  className="rounded-full border border-border p-2 disabled:opacity-60"
                >
                  <Pencil className="size-3.5" />
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
