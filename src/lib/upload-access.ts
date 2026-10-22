// Server-side counterpart to upload-access-rules: reads the store and answers
// "may this upload be served to an anonymous visitor?".
//
// On a store read failure we allow the fetch: loadStore already degrades to an
// in-memory seed and only throws when even that is impossible, at which point
// the pages that would embed the upload are failing too. Availability wins over
// a leak that requires a direct URL and a store outage at the same moment.

import { loadStore } from "@/lib/store";
import { decideUploadAccess, uploadReferences, type UploadAccess } from "@/lib/upload-access-rules";

export type { UploadAccess };

/** "public" when some published thing references this upload, else "owner". */
export async function uploadAccess(id: string): Promise<UploadAccess> {
  const clean = id.replace(/[^a-zA-Z0-9-]/g, "");
  if (!clean) return "owner";
  try {
    const store = await loadStore();
    return decideUploadAccess(uploadReferences(store, `/uploads/${clean}`));
  } catch {
    return "public";
  }
}
