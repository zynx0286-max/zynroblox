import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "@/lib/require-owner";
import { deleteUploadBlob, putUploadBlob, type UploadedBlob } from "@/lib/store";
import { safeExternalUrl } from "@/lib/url";

// Self-hosted uploads. Each file is persisted under its OWN storage key
// (`upload:<id>` in KV / data/uploads/<id>.json on disk) instead of being
// base64-stuffed into the single store value — a handful of images used to
// break every save by blowing past KV's per-value size limit. Clients are
// handed a stable `/uploads/<id>` URL that the uploads route serves back.
//
// MAX_UPLOAD_BYTES intentionally stays below Workers' 1 MB request-body limit
// so the data URL survives the server-function hop without extra plumbing.

export const MAX_UPLOAD_BYTES = 900_000;
const MAX_DATA_URL = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 256;

export function uploadUrl(id: string): string {
  return `/uploads/${id}`;
}

const uploadInput = z.object({
  name: z.string().min(1).max(120),
  mime: z
    .string()
    .max(80)
    .refine((v) => /^(image|audio|video)\//.test(v) || v === "application/octet-stream", {
      message: "Only image, audio and video files are allowed",
    }),
  dataUrl: z.string().min(20).max(MAX_DATA_URL),
});

export const saveUpload = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => uploadInput.parse(data))
  .handler(async ({ data }) => {
    const commaIdx = data.dataUrl.indexOf(",");
    const meta = commaIdx === -1 ? "" : data.dataUrl.slice(5, commaIdx);
    if (!meta.endsWith("base64")) throw new Error("Upload must be a base64 data URL");
    const dataBase64 = commaIdx === -1 ? "" : data.dataUrl.slice(commaIdx + 1);
    const size = Math.round(dataBase64.length * 0.75);
    if (size > MAX_UPLOAD_BYTES) throw new Error("File is too large (max ~0.9 MB)");

    const blob: UploadedBlob = {
      id: crypto.randomUUID(),
      name: data.name,
      mime: data.mime,
      size,
      dataBase64,
      createdAt: Date.now(),
    };
    await putUploadBlob(blob);
    return { id: blob.id, url: uploadUrl(blob.id) };
  });

export const deleteStoredUpload = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ url: z.string().min(1).max(2000) }).parse(data))
  .handler(async ({ data }) => {
    const m = /^\/uploads\/([a-zA-Z0-9-]+)$/.exec(data.url.trim());
    if (m?.[1]) {
      await deleteUploadBlob(m[1]);
      return { ok: true as const };
    }
    // Legacy: old uploads were raw data URLs stored inline in store.uploads.
    return { ok: true as const };
  });

/** Sanitizes an admin-provided media/image URL for storage. */
export function sanitizeStoredUrl(raw: string): string {
  return safeExternalUrl(raw) ?? "";
}
