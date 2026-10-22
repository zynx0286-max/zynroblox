// The audit line written when a work moves between draft and published.
//
// Kept separate and pure so the mapping — which kind, which summary, which
// detail — is testable without a store or a Supabase connection. The admin
// list's one-click toggle and the editor's Visibility select both go through
// here, so the activity feed reads the same no matter which control was used.

import type { ActivityEntry } from "@/lib/store";
import type { WorkStatus } from "./work-visibility.ts";

export type StatusChange = {
  title: string;
  slug?: string;
  status: WorkStatus;
  /** Which control made the change — useful when reconstructing a sequence. */
  source?: "toggle" | "editor";
};

export function statusActivity(change: StatusChange, at: Date = new Date()): ActivityEntry {
  const published = change.status === "published";
  return {
    at: at.toISOString(),
    kind: published ? "entry.published" : "entry.unpublished",
    summary: `${published ? "Published" : "Moved to draft"} ${change.title}`,
    ...(change.slug ? { slug: change.slug } : {}),
    detail: { status: change.status, ...(change.source ? { source: change.source } : {}) },
  };
}
