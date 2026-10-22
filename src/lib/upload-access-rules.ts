// Who may fetch a `/uploads/<id>` file?
//
// Uploads are addressed by an unguessable UUID with no per-file ACL, so the
// only thing that can decide "is this file public yet?" is what references it:
//
//   published work (thumbnail or media)      → public
//   testimonial avatar                       → public (testimonials have no draft state)
//   any site setting string                  → public
//   only draft work(s) reference it           → owner session required
//   nothing references it (fresh upload)      → owner session required
//
// The last rule is the one that closes the "unattached upload is world
// readable" gap: a file becomes public by being attached to something the
// public can see, never by existing.
//
// Pure so it can be unit tested without a store or a request; store.ts's
// loadStore and the uploads route supply the data.

// Relative + extension: this module is imported directly by `node --test`,
// which doesn't resolve the `@/` alias. Same pattern as bot-*-rules.ts.
import { normalizeWorkStatus } from "./work-visibility.ts";

export type UploadAccess = "public" | "owner";

export type UploadReference = {
  /** Where the reference lives — useful when explaining a 403 in logs. */
  kind: "work" | "media" | "testimonial" | "settings";
  /** Whether that reference is itself publicly visible. */
  published: boolean;
};

/** The slice of the store this decision needs (loose so tests stay tiny). */
export type UploadReferenceSource = {
  works?: ReadonlyArray<{ id?: string; image?: string; status?: unknown }>;
  media?: ReadonlyArray<{ workId?: string; url?: string }>;
  testimonials?: ReadonlyArray<{ imageUrl?: string }>;
  settings?: Record<string, unknown>;
};

/** Every reference to `url` in the store, with its public visibility. */
export function uploadReferences(store: UploadReferenceSource, url: string): UploadReference[] {
  if (!url) return [];
  const works = store.works ?? [];
  const byId = new Map(works.filter((w) => w.id).map((w) => [w.id as string, w]));
  const refs: UploadReference[] = [];

  for (const work of works) {
    if (work.image === url) {
      refs.push({ kind: "work", published: normalizeWorkStatus(work.status) === "published" });
    }
  }

  for (const item of store.media ?? []) {
    if (item.url !== url) continue;
    const owner = item.workId ? byId.get(item.workId) : undefined;
    // Media whose work was deleted is an orphan: nothing public points at it,
    // so it stays owner-only instead of becoming an anonymous URL.
    refs.push({
      kind: "media",
      published: !!owner && normalizeWorkStatus(owner.status) === "published",
    });
  }

  for (const testimonial of store.testimonials ?? []) {
    if (testimonial.imageUrl === url) refs.push({ kind: "testimonial", published: true });
  }

  if (containsString(store.settings, url)) {
    refs.push({ kind: "settings", published: true });
  }

  return refs;
}

/** Public when at least one public reference exists; owner-only otherwise. */
export function decideUploadAccess(refs: readonly UploadReference[]): UploadAccess {
  return refs.some((r) => r.published) ? "public" : "owner";
}

/** Exact match on any string in a JSON-ish value (settings are nested). */
function containsString(value: unknown, needle: string, depth = 0): boolean {
  if (depth > 12) return false;
  if (typeof value === "string") return value === needle;
  if (Array.isArray(value)) return value.some((v) => containsString(v, needle, depth + 1));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) =>
      containsString(v, needle, depth + 1),
    );
  }
  return false;
}
