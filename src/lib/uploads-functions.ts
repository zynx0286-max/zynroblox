import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "@/lib/require-owner";
import { mutate, type UploadedFile } from "@/lib/store";

// Self-hosted uploads: files are stored as base64 data URLs inside the JSON
// store, so no storage bucket is needed. Keep uploads small.

export const MAX_UPLOAD_BYTES = 1_500_000;
const MAX_DATA_URL = MAX_UPLOAD_BYTES * 1.4 + 128;

export const saveUpload = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        mime: z.string().max(80),
        dataUrl: z.string().min(20).max(MAX_DATA_URL),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const size = Math.round(data.dataUrl.length * 0.75);
    if (size > MAX_UPLOAD_BYTES) throw new Error("File is too large (max 1.5 MB)");
    const file: UploadedFile = {
      id: crypto.randomUUID(),
      name: data.name,
      mime: data.mime,
      size,
      dataUrl: data.dataUrl,
      createdAt: Date.now(),
    };
    await mutate((store) => {
      store.uploads.push(file);
    });
    return { id: file.id, dataUrl: file.dataUrl };
  });

export const deleteStoredUpload = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator((data: unknown) => z.object({ url: z.string().min(1).max(MAX_DATA_URL) }).parse(data))
  .handler(async ({ data }) => {
    await mutate((store) => {
      store.uploads = store.uploads.filter((u) => u.dataUrl !== data.url);
    });
    return { ok: true as const };
  });
