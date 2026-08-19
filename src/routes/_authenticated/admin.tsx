import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
  X,
  Star,
  Check,
  FileUp,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { captureError } from "@/lib/sentry";
import { CATEGORIES } from "@/data/works";
import {
  adminListWorks,
  createWork,
  deleteWork,
  isAdmin,
  reorderWork,
  updateWork,
  updateWorkCCU,
  updateWorkVisits,
  type DbWork,
  type WorkInput,
} from "@/lib/works.functions";
import {
  adminListReviews,
  createReview,
  deleteReview,
  updateReview,
  verifyReview,
  toggleReviewFeatured,
  type Review,
  type ReviewInput,
} from "@/lib/reviews.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/FileUpload";
import { AudioPlayer } from "@/components/AudioPlayer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — ZYN" },
      { name: "description", content: "Manage portfolio works, reviews, and media." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Panel — ZYN" },
      { property: "og:description", content: "Manage portfolio works, reviews, and media." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const emptyWork: WorkInput = {
  slug: "",
  title: "",
  category: "SFX / Audio",
  role: "",
  description: "",
  tags: [],
  href: "",
  linkLabel: "",
  imageUrl: "",
  featured: false,
  sortOrder: 0,
};

const emptyReview: ReviewInput = {
  authorName: "",
  authorEmail: "",
  rating: 5,
  title: "",
  content: "",
  screenshotUrls: [],
  projectRef: "",
};

const toWorkInput = (w: DbWork): WorkInput => ({
  slug: w.slug,
  title: w.title,
  category: w.category,
  role: w.role,
  description: w.description,
  tags: w.tags,
  href: w.href ?? "",
  linkLabel: w.linkLabel ?? "",
  imageUrl: w.image ?? "",
  featured: Boolean(w.featured),
  sortOrder: w.sortOrder,
});

const reviewToInput = (r: Review): ReviewInput => ({
  authorName: r.authorName,
  authorEmail: r.authorEmail,
  rating: r.rating,
  title: r.title,
  content: r.content,
  screenshotUrls: r.screenshotUrls,
  projectRef: r.projectRef || "",
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(adminListWorks);
  const admin = useServerFn(isAdmin);
  const create = useServerFn(createWork);
  const update = useServerFn(updateWork);
  const remove = useServerFn(deleteWork);
  const reorder = useServerFn(reorderWork);
  const updateCCU = useServerFn(updateWorkCCU);
  const updateVisits = useServerFn(updateWorkVisits);
  const listR = useServerFn(adminListReviews);
  const createR = useServerFn(createReview);
  const updateR = useServerFn(updateReview);
  const removeR = useServerFn(deleteReview);
  const verifyR = useServerFn(verifyReview);
  const toggleFeatureR = useServerFn(toggleReviewFeatured);

  const [tab, setTab] = useState<"works" | "reviews" | "media">("works");
  const [editing, setEditing] = useState<{ id: string | null; values: WorkInput } | null>(null);
  const [editingRev, setEditingRev] = useState<{ id: string | null; values: ReviewInput } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const adminQuery = useQuery({ queryKey: ["is-admin"], queryFn: () => admin() });
  const worksQuery = useQuery({ queryKey: ["admin-works"], queryFn: () => list() });
  const revsQuery = useQuery({ queryKey: ["admin-reviews"], queryFn: () => listR() });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-works"] });
    void qc.invalidateQueries({ queryKey: ["works"] });
    void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };

  const onError = (err: unknown) => {
    captureError(err, { area: "admin" });
    setError(err instanceof Error ? err.message : "Something went wrong");
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: string | null; values: WorkInput }) =>
      payload.id
        ? update({ data: { ...payload.values, id: payload.id } })
        : create({ data: payload.values }),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });

  const moveMutation = useMutation({
    mutationFn: (v: { id: string; sortOrder: number }) => reorder({ data: v }),
    onSuccess: invalidate,
    onError,
  });

  const updateCCUMutation = useMutation({
    mutationFn: (v: { id: string; ccu: number }) => updateCCU({ data: v }),
    onSuccess: invalidate,
    onError,
  });

  const updateVisitsMutation = useMutation({
    mutationFn: (v: { id: string; visits: number }) => updateVisits({ data: v }),
    onSuccess: invalidate,
    onError,
  });

  const saveRevMutation = useMutation({
    mutationFn: async (payload: { id: string | null; values: ReviewInput }) =>
      payload.id
        ? updateR({ data: { id: payload.id, updates: payload.values } })
        : createR({ data: payload.values }),
    onSuccess: () => {
      setEditingRev(null);
      setError(null);
      invalidate();
    },
    onError,
  });

  const deleteRevMutation = useMutation({
    mutationFn: (id: string) => removeR({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });

  const verifyRevMutation = useMutation({
    mutationFn: (id: string) => verifyR({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });

  const toggleFeatureRevMutation = useMutation({
    mutationFn: (id: string) => toggleFeatureR({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    await navigate({ to: "/auth" });
  };

  const works = worksQuery.data ?? [];
  const revs = revsQuery.data ?? [];
  const fieldBase =
    "w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20";
  const label = "font-display text-[0.68rem] tracking-wider text-muted-foreground uppercase";

  if (adminQuery.isSuccess && adminQuery.data === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="glass-card max-w-sm rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">Only admins can access this panel.</p>
          <button
            onClick={signOut}
            className="mt-6 rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground hover:shadow-lg"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-6 sm:p-8">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Admin Panel</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage portfolio, works, and reviews</p>
          </div>
          <div className="flex gap-2">
            <Link to="/work" className="glass-card rounded-full px-4 py-2.5 font-display text-sm hover:bg-secondary/60">
              View site
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 font-display text-sm hover:bg-secondary/60"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <span className="text-sm text-destructive">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="size-4" />
            </button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="works" className="flex items-center gap-2">
              <FileUp className="size-4" />
              Works ({works.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              Reviews ({revs.length})
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="works" className="space-y-6">
            <button
              onClick={() => setEditing({ id: null, values: { ...emptyWork, sortOrder: works.length } })}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground hover:shadow-lg"
            >
              <Plus className="size-4" /> Add Work
            </button>

            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate(editing);
                }}
                className="glass-card rounded-2xl p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">
                    {editing.id ? "Edit Work" : "New Work"}
                  </h2>
                  <button type="button" onClick={() => setEditing(null)} className="p-2 hover:bg-secondary/60 rounded-lg">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className={label}>Title *</span>
                    <input
                      required
                      className={fieldBase}
                      value={editing.values.title}
                      onChange={(e) =>
                        setEditing({ ...editing, values: { ...editing.values, title: e.target.value } })
                      }
                      placeholder="Project name"
                    />
                  </div>
                  <div>
                    <span className={label}>Slug *</span>
                    <input
                      required
                      className={fieldBase}
                      value={editing.values.slug}
                      onChange={(e) =>
                        setEditing({ ...editing, values: { ...editing.values, slug: e.target.value } })
                      }
                      placeholder="project-name"
                    />
                  </div>
                  <div>
                    <span className={label}>Category</span>
                    <select
                      className={fieldBase}
                      value={editing.values.category}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          values: { ...editing.values, category: e.target.value as any },
                        })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={label}>Role</span>
                    <input
                      className={fieldBase}
                      value={editing.values.role}
                      onChange={(e) =>
                        setEditing({ ...editing, values: { ...editing.values, role: e.target.value } })
                      }
                      placeholder="Your role"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Description</span>
                    <textarea
                      rows={4}
                      className={cn(fieldBase, "resize-none")}
                      value={editing.values.description}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          values: { ...editing.values, description: e.target.value },
                        })
                      }
                      placeholder="Describe your work"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Tags (comma-separated)</span>
                    <input
                      className={fieldBase}
                      value={editing.values.tags.join(", ")}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          values: {
                            ...editing.values,
                            tags: e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      placeholder="SFX, MMORPG, Audio"
                    />
                  </div>
                  <div>
                    <span className={label}>Link (optional)</span>
                    <input
                      className={fieldBase}
                      placeholder="https://…"
                      value={editing.values.href}
                      onChange={(e) =>
                        setEditing({ ...editing, values: { ...editing.values, href: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <span className={label}>Link label</span>
                    <input
                      className={fieldBase}
                      placeholder="View game"
                      value={editing.values.linkLabel}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          values: { ...editing.values, linkLabel: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Thumbnail URL</span>
                    <input
                      className={fieldBase}
                      placeholder="https://…"
                      value={editing.values.imageUrl}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          values: { ...editing.values, imageUrl: e.target.value },
                        })
                      }
                    />
                    {editing.values.imageUrl ? (
                      <img
                        src={editing.values.imageUrl}
                        alt="Thumbnail"
                        loading="lazy"
                        className="mt-3 h-24 rounded-xl object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <input
                      id="featured"
                      type="checkbox"
                      checked={editing.values.featured}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          values: { ...editing.values, featured: e.target.checked },
                        })
                      }
                    />
                    <label htmlFor="featured" className="text-sm">
                      Featured on homepage
                    </label>
                  </div>
                  <div>
                    <span className={label}>Sort Order</span>
                    <input
                      type="number"
                      min={0}
                      className={fieldBase}
                      value={editing.values.sortOrder}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          values: { ...editing.values, sortOrder: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div>
                    <span className={label}>Current CCU</span>
                    <div className="text-sm text-muted-foreground">
                      {(worksQuery.data?.find(w => w.id === editing.id)?.ccu) || 0}
                    </div>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      className={fieldBase}
                      onChange={(e) => {
                        const newCCU = Number(e.target.value) || 0;
                        if (editing.id) {
                          updateCCUMutation.mutate({ id: editing.id, ccu: newCCU });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <span className={label}>Current Visits</span>
                    <div className="text-sm text-muted-foreground">
                      {(worksQuery.data?.find(w => w.id === editing.id)?.visits) || 0}
                    </div>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      className={fieldBase}
                      onChange={(e) => {
                        const newVisits = Number(e.target.value) || 0;
                        if (editing.id) {
                          updateVisitsMutation.mutate({ id: editing.id, visits: newVisits });
                        }
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground hover:shadow-lg disabled:opacity-60"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Work
                </button>
              </form>
            ) : null}

            <div className="space-y-3">
              {worksQuery.isPending && <p className="text-sm text-muted-foreground">Loading works…</p>}
              {works.map((w, i) => (
                <div
                  key={w.id}
                  className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-4 sm:p-5"
                >
                  {w.image && (
                    <img
                      src={w.image}
                      alt=""
                      width={60}
                      height={60}
                      loading="lazy"
                      decoding="async"
                      className="size-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-40 flex-1">
                    <p className="font-display font-semibold">{w.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.category} • {w.role || "—"} • #{w.sortOrder}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        moveMutation.mutate({
                          id: w.id,
                          sortOrder: Math.max(0, w.sortOrder - 1),
                        })
                      }
                      disabled={i === 0}
                      className="rounded-lg border border-border p-2 hover:bg-secondary/60 disabled:opacity-40"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      onClick={() =>
                        moveMutation.mutate({
                          id: w.id,
                          sortOrder: w.sortOrder + 1,
                        })
                      }
                      className="rounded-lg border border-border p-2 hover:bg-secondary/60"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      onClick={() => setEditing({ id: w.id, values: toWorkInput(w) })}
                      className="rounded-lg border border-border px-4 py-2 font-display text-xs hover:bg-secondary/60"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${w.title}"?`)) deleteMutation.mutate(w.id);
                      }}
                      className="rounded-lg border border-destructive/50 p-2 text-destructive hover:bg-destructive/20"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <button
              onClick={() => setEditingRev({ id: null, values: { ...emptyReview } })}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground hover:shadow-lg"
            >
              <Plus className="size-4" /> Add Review
            </button>

            {editingRev ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRevMutation.mutate(editingRev);
                }}
                className="glass-card rounded-2xl p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">
                    {editingRev.id ? "Edit Review" : "New Review"}
                  </h2>
                  <button type="button" onClick={() => setEditingRev(null)} className="p-2 hover:bg-secondary/60 rounded-lg">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className={label}>Author Name *</span>
                    <input
                      required
                      className={fieldBase}
                      value={editingRev.values.authorName}
                      onChange={(e) =>
                        setEditingRev({
                          ...editingRev,
                          values: { ...editingRev.values, authorName: e.target.value },
                        })
                      }
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <span className={label}>Email *</span>
                    <input
                      required
                      type="email"
                      className={fieldBase}
                      value={editingRev.values.authorEmail}
                      onChange={(e) =>
                        setEditingRev({
                          ...editingRev,
                          values: { ...editingRev.values, authorEmail: e.target.value },
                        })
                      }
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <span className={label}>Rating *</span>
                    <select
                      className={fieldBase}
                      value={editingRev.values.rating}
                      onChange={(e) =>
                        setEditingRev({
                          ...editingRev,
                          values: { ...editingRev.values, rating: parseInt(e.target.value) },
                        })
                      }
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {"⭐".repeat(r)} {r} stars
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={label}>Project (Optional)</span>
                    <input
                      className={fieldBase}
                      value={editingRev.values.projectRef || ""}
                      onChange={(e) =>
                        setEditingRev({
                          ...editingRev,
                          values: { ...editingRev.values, projectRef: e.target.value },
                        })
                      }
                      placeholder="project-slug"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Review Title *</span>
                    <input
                      required
                      className={fieldBase}
                      value={editingRev.values.title}
                      onChange={(e) =>
                        setEditingRev({
                          ...editingRev,
                          values: { ...editingRev.values, title: e.target.value },
                        })
                      }
                      placeholder="Review headline"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Content *</span>
                    <textarea
                      required
                      rows={5}
                      className={cn(fieldBase, "resize-none")}
                      value={editingRev.values.content}
                      onChange={(e) =>
                        setEditingRev({
                          ...editingRev,
                          values: { ...editingRev.values, content: e.target.value },
                        })
                      }
                      placeholder="Detailed review…"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Screenshots (comma-separated URLs)</span>
                    <input
                      className={fieldBase}
                      value={editingRev.values.screenshotUrls.join(", ")}
                      onChange={(e) =>
                        setEditingRev({
                          ...editingRev,
                          values: {
                            ...editingRev.values,
                            screenshotUrls: e.target.value
                              .split(",")
                              .map((url) => url.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      placeholder="https://… https://…"
                    />
                    {editingRev.values.screenshotUrls.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {editingRev.values.screenshotUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Screenshot ${i + 1}`}
                            loading="lazy"
                            className="h-20 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saveRevMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground hover:shadow-lg disabled:opacity-60"
                >
                  {saveRevMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Review
                </button>
              </form>
            ) : null}

            <div className="space-y-3">
              {revsQuery.isPending && <p className="text-sm text-muted-foreground">Loading reviews…</p>}
              {revs.map((r) => (
                <div key={r.id} className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold flex items-center gap-2">
                        {r.title}
                        <span className="text-lg">{"⭐".repeat(r.rating)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.authorName} •
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                      {!r.verified && (
                        <span className="mt-1 inline-block bg-yellow-500/20 text-yellow-700 px-2 py-1 text-xs rounded-full">
                          Unverified
                        </span>
                      )}
                      {r.featured && (
                        <span className="ml-2 inline-block bg-primary/20 text-primary px-2 py-1 text-xs rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {!r.verified && (
                        <button
                          onClick={() => verifyRevMutation.mutate(r.id)}
                          disabled={verifyRevMutation.isPending}
                          className="rounded-lg border border-primary/50 px-3 py-2 text-xs text-primary hover:bg-primary/10 disabled:opacity-60"
                        >
                          <Check className="size-4" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleFeatureRevMutation.mutate(r.id)}
                        disabled={toggleFeatureRevMutation.isPending}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs disabled:opacity-60",
                          r.featured
                            ? "border-primary/50 text-primary hover:bg-primary/10"
                            : "border-border hover:bg-secondary/60",
                        )}
                      >
                        <Star className={cn("size-4", r.featured && "fill-current")} />
                      </button>
                      <button
                        onClick={() => setEditingRev({ id: r.id, values: reviewToInput(r) })}
                        className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary/60"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this review?")) deleteRevMutation.mutate(r.id);
                        }}
                        className="rounded-lg border border-destructive/50 px-3 py-2 text-xs text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.content}</p>
                  {r.screenshotUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {r.screenshotUrls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          loading="lazy"
                          className="h-20 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold mb-4">Upload Media Files</h3>
              <FileUpload
                accept=".mp3,.wav,.ogg,.jpg,.jpeg,.png,.webp,.pdf"
                maxSize={100}
                onFilesSelected={async (files) => {
                  console.log("Files uploaded:", files);
                }}
              />
            </div>
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold mb-4">Audio Player Sample</h3>
              <AudioPlayer src="https://example.com/sample.mp3" title="Sample Audio Track" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
