import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { captureError } from "@/lib/sentry";
import {
  adminListTestimonials,
  createTestimonial,
  deleteTestimonial,
  updateTestimonial,
  type Testimonial,
  type TestimonialInput,
} from "@/lib/site.functions";
import { pickAndUpload, deleteUpload } from "@/lib/uploads";

const empty: TestimonialInput = {
  author: "",
  role: "",
  text: "",
  rating: 5,
  imageUrl: "",
  featured: false,
  sortOrder: 0,
};

const toInput = (t: Testimonial): TestimonialInput => ({
  author: t.author,
  role: t.role,
  text: t.text,
  rating: t.rating,
  imageUrl: t.imageUrl ?? "",
  featured: t.featured,
  sortOrder: t.sortOrder,
});

export function TestimonialsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListTestimonials);
  const create = useServerFn(createTestimonial);
  const update = useServerFn(updateTestimonial);
  const remove = useServerFn(deleteTestimonial);

  const [editing, setEditing] = useState<{ id: string | null; values: TestimonialInput } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: () => list(),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
  const onError = (err: unknown) => {
    captureError(err, { area: "admin" });
    setError(err instanceof Error ? err.message : "Something went wrong");
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: string | null; values: TestimonialInput }) =>
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
    mutationFn: (v: { id: string; sortOrder: number }) =>
      update({
        data: {
          ...toInput({ ...(query.data ?? []).find((t) => t.id === v.id)!, sortOrder: v.sortOrder }),
          id: v.id,
        },
      }),
    onSuccess: invalidate,
    onError,
  });

  const listItems = query.data ?? [];
  const field =
    "mt-1.5 w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm outline-none focus:border-primary/60";
  const label = "font-display text-[0.68rem] tracking-wider text-muted-foreground uppercase";

  const pickImage = async () => {
    if (!editing) return;
    try {
      const url = await pickAndUpload("testimonials", "image/*");
      setEditing({ ...editing, values: { ...editing.values, imageUrl: url } });
    } catch (err) {
      onError(err);
    }
  };

  return (
    <>
      {error ? (
        <p className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        onClick={() => setEditing({ id: null, values: { ...empty, sortOrder: listItems.length } })}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground"
      >
        <Plus className="size-4" /> Add testimonial
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
              {editing.id ? "Edit testimonial" : "New testimonial"}
            </h2>
            <button type="button" onClick={() => setEditing(null)} aria-label="Close editor">
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <span className={label}>Author</span>
              <input
                required
                className={field}
                placeholder="e.g. Game Studio Owner"
                value={editing.values.author}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    values: { ...editing.values, author: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <span className={label}>Role / context</span>
              <input
                className={field}
                placeholder="e.g. Founder, Simple Bricks"
                value={editing.values.role}
                onChange={(e) =>
                  setEditing({ ...editing, values: { ...editing.values, role: e.target.value } })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <span className={label}>Testimonial</span>
              <textarea
                rows={4}
                required
                className={`${field} resize-none`}
                placeholder="What they said…"
                value={editing.values.text}
                onChange={(e) =>
                  setEditing({ ...editing, values: { ...editing.values, text: e.target.value } })
                }
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
                    onClick={() =>
                      setEditing({ ...editing, values: { ...editing.values, rating: n } })
                    }
                  >
                    <Star
                      className={`size-6 ${n <= editing.values.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
                    />
                  </button>
                ))}
              </div>
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
            <div className="sm:col-span-2">
              <span className={label}>Photo (screenshot or avatar)</span>
              <div className="mt-1.5 flex items-center gap-3">
                {editing.values.imageUrl ? (
                  <img
                    src={editing.values.imageUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 rounded-full object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={pickImage}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 font-display text-xs"
                >
                  <ImageIcon className="size-4" />
                  {editing.values.imageUrl ? "Replace photo" : "Upload photo"}
                </button>
                {editing.values.imageUrl ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await deleteUpload(editing.values.imageUrl);
                        setEditing({ ...editing, values: { ...editing.values, imageUrl: "" } });
                      } catch (err) {
                        onError(err);
                      }
                    }}
                    className="rounded-full border border-destructive/50 p-2 text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
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
              <label htmlFor="featured" className="text-sm text-muted-foreground">
                Highlight on the home page
              </label>
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
            Save testimonial
          </button>
        </form>
      ) : null}

      <div className="mt-8 space-y-3">
        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Loading testimonials…</p>
        ) : null}
        {listItems.map((t, i) => (
          <div
            key={t.id}
            className="glass-card flex flex-wrap items-center gap-3 rounded-2xl p-3 sm:p-4"
          >
            {t.imageUrl ? (
              <img
                src={t.imageUrl}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                className="size-12 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 font-display text-lg font-bold text-primary">
                {t.author.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-40 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display text-sm font-semibold">{t.author}</p>
                <span className="flex items-center gap-0.5 text-primary">
                  {Array.from({ length: t.rating }, (_, n) => (
                    <Star key={n} className="size-3 fill-primary" />
                  ))}
                </span>
                {t.featured ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.6rem] tracking-wider text-primary uppercase">
                    Highlighted
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{t.role || "—"}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                aria-label="Move up"
                disabled={i === 0}
                onClick={() =>
                  moveMutation.mutate({ id: t.id, sortOrder: Math.max(0, t.sortOrder - 1) })
                }
                className="rounded-full border border-border p-2 disabled:opacity-40"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                aria-label="Move down"
                onClick={() => moveMutation.mutate({ id: t.id, sortOrder: t.sortOrder + 1 })}
                className="rounded-full border border-border p-2"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                onClick={() => setEditing({ id: t.id, values: toInput(t) })}
                className="rounded-full border border-border px-4 py-2 font-display text-xs"
              >
                Edit
              </button>
              <button
                aria-label={`Delete ${t.author}`}
                onClick={() => {
                  if (window.confirm(`Delete testimonial from "${t.author}"?`))
                    deleteMutation.mutate(t.id);
                }}
                className="rounded-full border border-destructive/50 p-2 text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {listItems.length === 0 && !query.isPending ? (
          <p className="rounded-2xl border border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No testimonials yet — add the first one to show on the home page.
          </p>
        ) : null}
      </div>
    </>
  );
}
