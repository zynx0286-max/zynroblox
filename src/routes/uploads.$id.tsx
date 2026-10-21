import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { getUploadBlob } from "@/lib/store";
import { COOKIE_NAME, verifySessionToken } from "@/lib/owner-session";

// Serves self-hosted uploads by id: GET /uploads/<uuid>. Each upload lives in
// its own storage key (KV on Workers, data/uploads/*.json locally), so this
// route streams the stored bytes back as a normal static-looking URL. Browser
// caching keeps repeat views cheap; only known-safe content types are served.
//
// Access gate: modern browsers send `Sec-Fetch-Dest` with every subresource.
// In-page playback arrives as `audio`/`video`, images as `image`, and
// same-origin fetches as `empty` — all allowed. A bare URL typed into the
// address bar (`document`) or wrapped in someone else's iframe is the
// "open in a tab → right-click → Save audio as…" flow, so those are turned
// away — UNLESS the request carries a valid owner session. That exception is
// what keeps the admin panel's own workflows intact: the owner can still open
// an uploaded file directly to inspect it at full size, while the same URL in
// an anonymous visitor's tab is refused.
//
// "Private" admin media is only as private as its UUID: uploads are stored by
// id and served by id with no per-file ACL, and the store has no draft state
// (every work in it is public), so an upload that is not referenced anywhere
// is still reachable by anyone who learns its URL. The `X-Robots-Tag: noindex`
// below stops crawlers from indexing such URLs when they leak; anything that
// must be truly private needs a reference check (media/work/testimonial rows)
// rather than this gate.
const BLOCKED_DESTS = new Set(["document", "iframe"]);

/** True when the request already carries a signed owner session cookie. */
async function isOwner(request: Request): Promise<boolean> {
  const header = request.headers.get("cookie") ?? "";
  const match = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`).exec(header);
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (token) return verifySessionToken(token);
  // Some runtimes expose cookies through the framework instead of the raw
  // header; fall back to it before declaring the visitor anonymous.
  try {
    const fallback = getCookie(COOKIE_NAME) ?? null;
    return fallback ? await verifySessionToken(fallback) : false;
  } catch {
    return false;
  }
}

/** The "protected" page shown to blocked direct-open attempts. */
function protectedResponse(reason: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Protected preview</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b0f;color:#e5e5e5;display:grid;place-items:center;min-height:100vh;margin:0}
.card{max-width:28rem;padding:2rem;text-align:center}
h1{font-size:1.1rem;margin:0 0 .75rem}p{color:#9ca3af;font-size:.9rem;line-height:1.5;margin:0}</style></head>
<body><div class="card"><h1>Protected preview</h1>
<p>This sample belongs to ZYN and is streamed as a protected preview only.
To use it in a project get in touch at the Work Archive — reusing without
permission is a DMCA takedown and a Roblox asset-theft report.</p></div></body></html>`,
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
        const dest = request.headers.get("sec-fetch-dest")?.toLowerCase() ?? "";
        if (BLOCKED_DESTS.has(dest) && !(await isOwner(request))) {
          console.warn(`[uploads] blocked ${dest} fetch for /uploads/${params.id}`);
          return protectedResponse(dest);
        }

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
