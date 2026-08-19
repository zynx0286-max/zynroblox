import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileAudio,
  Film,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { captureError } from "@/lib/sentry";
import { resolveAsset } from "@/lib/assets";
import { CATEGORIES } from "@/data/works";
import {
  adminListWorks,
  createWork,
  deleteWork,
  reorderWork,
  updateWork,
  type DbWork,
  type WorkInput,
} from "@/lib/works.functions";
import {
  addWorkMedia,
  deleteWorkMedia,
  listWorkMedia,
  updateWorkMedia,
  type WorkMedia,
} from "@/lib/site.functions";
import { pickAndUpload, deleteUpload } from "@/lib/uploads";

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

export function WorksAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListWorks);
  const create = useServerFn(createWork);
  const update = useServerFn(updateWork);
  const remove = useServerFn(deleteWork);
  const reorder = useServerFn(reorderWork);

  const [editing, setEditing] = useState<{ id: string | null; values: WorkInput } | null>(null);
  const [mediaFor, setMediaFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const works = worksQuery.data ?? [];
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
                  src={resolveAsset(editing.values.imageUrl)}
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
          <div key={w.id}>
            <div className="glass-card flex flex-wrap items-center gap-3 rounded-2xl p-3 sm:p-4">
              {w.image ? (
                <img
                  src={resolveAsset(w.image)}
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
              <div className="flex flex-wrap gap-1.5">
                <button
                  aria-label="Manage media"
                  onClick={() => setMediaFor(mediaFor === w.id ? null : w.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-display text-xs"
                >
                  <Paperclip className="size-3.5" /> Media
                </button>
                <button
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() =>
                    moveMutation.mutate({ id: w.id, sortOrder: Math.max(0, w.sortOrder - 1) })
                  }
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

            {mediaFor === w.id ? <WorkMediaPanel work={w} onError={onError} /> : null}
          </div>
        ))}
      </div>
    </>
  );
}

function WorkMediaPanel({ work, onError }: { work: DbWork; onError: (err: unknown) => void }) {
  const qc = useQueryClient();
  const list = useServerFn(listWorkMedia);
  const add = useServerFn(addWorkMedia);
  const update = useServerFn(updateWorkMedia);
  const remove = useServerFn(deleteWorkMedia);
  const [uploading, setUploading] = useState<"image" | "audio" | "video" | null>(null);

  const mediaQuery = useQuery({
    queryKey: ["admin-media", work.id],
    queryFn: () => list(),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-media", work.id] });

  const media = (mediaQuery.data ?? []).filter((m) => m.workId === work.id);

  const upload = async (type: "image" | "audio" | "video") => {
    const accept = type === "image" ? "image/*" : type === "audio" ? "audio/*" : "video/*";
    setUploading(type);
    try {
      const url = await pickAndUpload(accept);
      await add({
        data: { workId: work.id, mediaType: type, url, caption: "", sortOrder: media.length },
      });
      invalidate();
    } catch (err) {
      onError(err);
    } finally {
      setUploading(null);
    }
  };

  const del = async (m: WorkMedia) => {
    try {
      await deleteUpload(m.url);
      await remove({ data: { id: m.id } });
      invalidate();
    } catch (err) {
      onError(err);
    }
  };

  const setCaption = async (m: WorkMedia, caption: string) => {
    try {
      await update({
        data: {
          id: m.id,
          workId: m.workId,
          mediaType: m.mediaType,
          url: m.url,
          caption,
          sortOrder: m.sortOrder,
        },
      });
      invalidate();
    } catch (err) {
      onError(err);
    }
  };

  return (
    <div className="mt-2 rounded-2xl border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold">
          Media for “{work.title}” <span className="text-muted-foreground">({media.length})</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => upload("image")}
            disabled={uploading !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-display text-xs disabled:opacity-50"
          >
            {uploading === "image" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImageIcon className="size-3.5" />
            )}
            Image
          </button>
          <button
            onClick={() => upload("audio")}
            disabled={uploading !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-display text-xs disabled:opacity-50"
          >
            {uploading === "audio" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileAudio className="size-3.5" />
            )}
            Audio
          </button>
          <button
            onClick={() => upload("video")}
            disabled={uploading !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-display text-xs disabled:opacity-50"
          >
            {uploading === "video" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Film className="size-3.5" />
            )}
            Video
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/40 px-3 py-2 font-display text-xs text-muted-foreground">
            <Upload className="size-3.5" /> 100MB max
          </span>
        </div>
      </div>

      {mediaQuery.isPending ? <p className="mt-3 text-xs text-muted-foreground">Loading…</p> : null}

      <div className="mt-3 space-y-2">
        {media.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/20 p-2.5"
          >
            {m.mediaType === "image" ? (
              <img
                src={m.url}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                className="size-12 rounded-lg object-cover"
              />
            ) : m.mediaType === "audio" ? (
              <span className="flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <FileAudio className="size-5" />
              </span>
            ) : (
              <span className="flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Film className="size-5" />
              </span>
            )}
            <input
              defaultValue={m.caption}
              onBlur={(e) => {
                if (e.target.value !== m.caption) void setCaption(m, e.target.value);
              }}
              placeholder="Caption"
              className="min-w-32 flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
            <span className="rounded-full bg-secondary/60 px-2 py-1 text-[0.65rem] tracking-wider text-muted-foreground uppercase">
              {m.mediaType}
            </span>
            <button
              aria-label="Delete media"
              onClick={() => {
                if (window.confirm("Delete this media item?")) void del(m);
              }}
              className="rounded-full border border-destructive/50 p-2 text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {media.length === 0 && !mediaQuery.isPending ? (
          <p className="text-xs text-muted-foreground">
            No media yet — upload screenshots, audio previews or video clips.
          </p>
        ) : null}
      </div>
    </div>
  );
}
