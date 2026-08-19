import { deleteStoredUpload, saveUpload } from "@/lib/uploads-functions";

// Client-side helpers that talk to the self-hosted upload store over RPC.

export const MAX_UPLOAD_BYTES = 1_500_000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/** Uploads a file into the self-hosted store and returns its data URL. */
export async function uploadFile(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is too large (max 1.5 MB)");
  const dataUrl = await readAsDataUrl(file);
  const res = await saveUpload({
    data: { name: file.name, mime: file.type || "application/octet-stream", dataUrl },
  });
  return res.dataUrl;
}

/** Opens a file picker and uploads the selected file. */
export async function pickAndUpload(accept: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        resolve(await uploadFile(file));
      } catch (err) {
        reject(err);
      }
    };
    input.onerror = () => reject(new Error("File picker failed"));
    input.click();
  });
}

/** Removes an uploaded file from the store. No-ops for external URLs. */
export async function deleteUpload(url: string): Promise<void> {
  if (!url.startsWith("data:")) return;
  await deleteStoredUpload({ data: { url } });
}
