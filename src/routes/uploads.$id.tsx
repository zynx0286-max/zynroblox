import { createFileRoute } from "@tanstack/react-router";
import { getUploadBlob } from "@/lib/store";
import { hasOwnerSession } from "@/lib/request-owner";
import { uploadAccess } from "@/lib/upload-access";

// Serves self-hosted uploads by id: GET /uploads/<uuid>. Each upload lives in
// its own storage key (KV on Workers, data/uploads/*.json locally), so this
// route streams the stored bytes back as a normal static-looking URL.
//
// Two gates, both skipped for a request carrying a valid owner session:
//
// 1. DRAFT STATE (upload-access.ts): a file is public only while something
//    public references it — a published work's thumbnail or media, a
//    testimonial avatar, a site setting. Files attached only to a DRAFT work,
//    or not attached at all yet, answer 403 to anonymous visitors. Publishing
//    the work is what makes them public; there is no per-file ACL to manage.
//
// 2. DIRECT-OPEN (Sec-Fetch-Dest): modern browsers send it with every
//    subresource. In-page playback arrives as `audio`/`video`, images as
//    `image`, same-origin fetches as `empty` — all allowed. A bare URL typed
//    into the address bar (`document`) or wrapped in someone else's iframe is
//    the "open in a tab → right-click → Save audio as…" flow, so those are
//    turned away even for public files. The owner exception keeps the admin
//    panel's own workflows intact: the owner can still open an upload directly
//    to inspect it at full size.
const BLOCKED_DESTS = new Set(["document", "iframe"]);

/** The "protected" page shown to blocked direct-open attempts. */
function protectedResponse(reason: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Protected preview</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b0f;color:#e5e5e5;display:grid;place-items:center;min-height:100vh;margin:0}
.card{max-width:28rem;padding:2rem;text-align:center}
h1{font-size:1.1rem;margin:0 0 .75rem}p{color:#9ca3af;font-size:.9rem;line-height:1.5;margin:0}</style></head>
<body><div class="card"><h1>Protected preview</h1>
<p>${reason === "draft" ? "This file belongs to a project that isn't public yet. Sign in to the admin panel to view it." : "This sample belongs to ZYN and is streamed as a protected preview only.\nTo use it in a project get in touch at the Work Archive — reusing without\npermission is a DMCA takedown and a Roblox asset-theft report."}</p></div></body></html>`,
    {
      status: 403,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

export const Route = createFileRoute("/uploads/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const clean = (params.id ?? "").replace(/[^a-zA-Z0-9-]/g, "");
        if (!clean) return new Response("Not found", { status: 404 });

        // 404 before touching the store: unknown ids shouldn't pay for a lookup.
        const blob = await getUploadBlob(clean);
        if (!blob) return new Response("Not found", { status: 404 });

        const dest = request.headers.get("sec-fetch-dest")?.toLowerCase() ?? "";
        const owner = await hasOwnerSession(request);
        const draftOnly = (await uploadAccess(clean)) === "owner";

        if (!owner) {
          if (draftOnly) {
            console.warn(
              `[uploads] blocked anonymous ${dest || "unknown"} fetch for draft ${clean}`,
            );
            return protectedResponse("draft");
          }
          if (BLOCKED_DESTS.has(dest)) {
            console.warn(`[uploads] blocked ${dest} fetch for /uploads/${clean}`);
            return protectedResponse(dest);
          }
        }

        const safeMime = /^(image|audio|video)\//.test(blob.mime)
          ? blob.mime
          : "application/octet-stream";
        const bytes = Uint8Array.from(atob(blob.dataBase64), (c) => c.charCodeAt(0));

        return new Response(bytes.buffer as ArrayBuffer, {
          headers: {
            "Content-Type": safeMime,
            "Content-Length": String(bytes.byteLength),
            // A draft-only file must never be cached by a shared cache: the
            // next request may be anonymous. Public files stay immutable.
            "Cache-Control": draftOnly
              ? "private, no-store"
              : "public, max-age=31536000, immutable",
            // Keep the player's forward/rewind UI, not a download affordance.
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
            // Upload URLs are unguessable, but never indexable: a leaked draft
            // or admin-only asset must not turn up in search results.
            "X-Robots-Tag": "noindex, nofollow",
            "Content-Security-Policy": "default-src 'none'; sandbox",
          },
        });
      },
    },
  },
});
