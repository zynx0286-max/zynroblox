// Draft vs published works.
//
// A work is PUBLIC unless it is explicitly a draft. Legacy rows (written
// before this field existed) and rows created by the bot CLI carry no status
// at all, so the default has to be "published" — the alternative would hide
// the whole existing portfolio the first time this code ran.
//
// Pure functions only: the store, the server functions, the admin panel and
// the uploads gate all import from here so they can never disagree about what
// "draft" means.

export type WorkStatus = "published" | "draft";

export const WORK_STATUSES = ["published", "draft"] as const;

/** Anything that isn't explicitly "draft" is published. */
export function normalizeWorkStatus(value: unknown): WorkStatus {
  return value === "draft" ? "draft" : "published";
}

/** True when the entry is an unfinished draft (owner-only). */
export function isDraft(work: { status?: unknown }): boolean {
  return normalizeWorkStatus(work.status) === "draft";
}

/**
 * The works a visitor may see. The owner (signed session) sees everything so
 * drafts can be previewed on the real pages; everyone else gets published
 * entries only.
 */
export function filterVisibleWorks<T extends { status?: unknown }>(
  works: readonly T[],
  owner: boolean,
): T[] {
  return owner ? [...works] : works.filter((w) => !isDraft(w));
}
