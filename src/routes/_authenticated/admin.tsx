import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, LogOut, Plus, Save, Trash2, X } from "lucide-react";
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
  type DbWork,
  type WorkInput,
} from "@/lib/works.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ZYN portfolio works editor" },
      { name: "description", content: "Add, edit, reorder and delete portfolio works." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — ZYN portfolio works editor" },
      { property: "og:description", content: "Add, edit, reorder and delete portfolio works." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const empty: WorkInput = {
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

const toInput = (w: DbWork): WorkInput => ({
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

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(adminListWorks);
  const admin = useServerFn(isAdmin);
  const create = useServerFn(createWork);
  const update = useServerFn(updateWork);
  const remove = useServerFn(deleteWork);
  const reorder = useServerFn(reorderWork);

  const [editing, setEditing] = useState<{ id: string | null; values: WorkInput } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const adminQuery = useQuery({ queryKey: ["is-admin"], queryFn: () => admin() });
  const worksQuery = useQuery({ queryKey: ["admin-works"], queryFn: () => list() });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-works"] });
    void qc.invalidateQueries({ queryKey: ["works"] });
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

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    await navigate({ to: "/auth" });
  };

  const works = worksQuery.data ?? [];
  const field =
    "mt-1.5 w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm outline-none focus:border-primary/60";
  const label = "font-display text-[0.68rem] tracking-wider text-muted-foreground uppercase";

  if (adminQuery.isSuccess && adminQuery.data === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="glass-card max-w-sm rounded-2xl p-8">
          <h1 className="font-display text-xl font-bold">No admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account isn&apos;t an admin, so it can&apos;t edit works.
          </p>
          <button
            onClick={signOut}
            className="mt-6 rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Works admin</h1>
            <p className="text-sm text-muted-foreground">
              {works.length} projects — edits go live on the site instantly.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/work"
              className="glass-card rounded-full px-4 py-2.5 font-display text-sm hover:bg-secondary/50"
            >
              View site
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 font-display text-sm hover:bg-secondary/50"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </header>

        {error ? (
          <p className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          onClick={() => setEditing({ id: null, values: { ...empty, sortOrder: works.length } })}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground"
        >
          <Plus className="size-4" /> Add work
        </button>

        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(editing);
            }}
            className="glass-card mt-6 rounded-2xl p-5 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                {editing.id ? "Edit work" : "New work"}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close editor">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <span className={label}>Title</span>
                <input
                  required
                  className={field}
                  value={editing.values.title}
                  onChange={(e) =>
                    setEditing({ ...editing, values: { ...editing.values, title: e.target.value } })
                  }
                />
              </div>
              <div>
                <span className={label}>Slug (url)</span>
                <input
                  required
                  className={field}
                  value={editing.values.slug}
                  onChange={(e) =>
                    setEditing({ ...editing, values: { ...editing.values, slug: e.target.value } })
                  }
                />
              </div>
              <div>
                <span className={label}>Category</span>
                <select
                  className={field}
                  value={editing.values.category}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      values: { ...editing.values, category: e.target.value },
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
                  className={field}
                  value={editing.values.role}
                  onChange={(e) =>
                    setEditing({ ...editing, values: { ...editing.values, role: e.target.value } })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <span className={label}>Description</span>
                <textarea
                  rows={3}
                  className={`${field} resize-none`}
                  value={editing.values.description}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      values: { ...editing.values, description: e.target.value },
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <span className={label}>Tags (comma separated)</span>
                <input
                  className={field}
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
                />
              </div>
              <div>
                <span className={label}>Link (optional)</span>
                <input
                  className={field}
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
                  className={field}
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
                <span className={label}>Thumbnail image URL</span>
                <input
                  className={field}
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
                    alt="Thumbnail preview"
                    loading="lazy"
                    className="mt-3 size-24 rounded-xl object-cover"
                  />
                ) : null}
              </div>
              <div className="flex items-center gap-3">
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
                <label htmlFor="featured" className="text-sm text-muted-foreground">
                  Featured on the home page
                </label>
              </div>
              <div>
                <span className={label}>Sort order</span>
                <input
                  type="number"
                  min={0}
                  className={field}
                  value={editing.values.sortOrder}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      values: { ...editing.values, sortOrder: Number(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save work
            </button>
          </form>
        ) : null}

        <div className="mt-8 space-y-3">
          {worksQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading works…</p>
          ) : null}
          {works.map((w, i) => (
            <div
              key={w.id}
              className="glass-card flex flex-wrap items-center gap-3 rounded-2xl p-3 sm:p-4"
            >
              {w.image ? (
                <img
                  src={w.image}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                  className="size-14 rounded-xl object-cover"
                />
              ) : (
                <div className="size-14 rounded-xl bg-secondary/50" />
              )}
              <div className="min-w-40 flex-1">
                <p className="font-display text-sm font-semibold">{w.title}</p>
                <p className="text-xs text-muted-foreground">
                  {w.category} · {w.role || "—"} · #{w.sortOrder}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => moveMutation.mutate({ id: w.id, sortOrder: Math.max(0, w.sortOrder - 1) })}
                  className="rounded-full border border-border p-2 disabled:opacity-40"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  aria-label="Move down"
                  onClick={() => moveMutation.mutate({ id: w.id, sortOrder: w.sortOrder + 1 })}
                  className="rounded-full border border-border p-2"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  onClick={() => setEditing({ id: w.id, values: toInput(w) })}
                  className="rounded-full border border-border px-4 py-2 font-display text-xs"
                >
                  Edit
                </button>
                <button
                  aria-label={`Delete ${w.title}`}
                  onClick={() => {
                    if (window.confirm(`Delete "${w.title}"?`)) deleteMutation.mutate(w.id);
                  }}
                  className="rounded-full border border-destructive/50 p-2 text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
