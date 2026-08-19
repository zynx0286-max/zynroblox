import { supabase } from "@/integrations/supabase/client";

const BUCKET = "uploads";

function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return cleaned || "file";
}

/** Uploads a file to the public `uploads` bucket and returns its public URL. */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const path = `${folder.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Opens a file picker and uploads the selected file. */
export async function pickAndUpload(folder: string, accept: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        resolve(await uploadFile(file, folder));
      } catch (err) {
        reject(err);
      }
    };
    input.onerror = () => reject(new Error("File picker failed"));
    input.click();
  });
}

export async function deleteUpload(url: string): Promise<void> {
  const prefix = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(prefix);
  if (idx === -1) return;
  const path = url.slice(idx + prefix.length);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
