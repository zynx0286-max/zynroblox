import { createFileRoute } from "@tanstack/react-router";
import { getUploadBlob } from "@/lib/store";

// Serves self-hosted uploads by id: GET /uploads/<uuid>. Each upload lives in
// its own storage key (KV on Workers, data/uploads/*.json locally), so this
// route streams the stored bytes back as a normal static-looking URL. Browser
// caching keeps repeat views cheap; only known-safe content types are served.

export const Route = createFileRoute("/uploads/$id")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { id: string } }) => {
        const clean = (params.id ?? "").replace(/[^a-zA-Z0-9-]/g, "");
        if (!clean) return new Response("Not found", { status: 404 });

        const blob = await getUploadBlob(clean);
        if (!blob) return new Response("Not found", { status: 404 });

        const safeMime = /^(image|audio|video)\//.test(blob.mime)
          ? blob.mime
          : "application/octet-stream";
        const bytes = Uint8Array.from(atob(blob.dataBase64), (c) => c.charCodeAt(0));

        return new Response(bytes.buffer as ArrayBuffer, {
          headers: {
            "Content-Type": safeMime,
            "Content-Length": String(bytes.byteLength),
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
          },
        });
      },
    },
  },
});
