import { createFileRoute } from "@tanstack/react-router";
import { isIngestConfigured, verifyIngestSignature, checkIngestRateLimit } from "@/lib/ingest-auth";
import { ingestMessage } from "@/lib/ingest";
import { setOwnerDiscordId } from "@/lib/notify-config";

// POST /api/discord-ingest — receives DM text from the local Discord bot.
//
// Headers:
//   x-signature: hex HMAC-SHA256 of "<ms-epoch>.<rawBody>" (DISCORD_BOT_SECRET)
//   x-timestamp: ms epoch (±5 min window, blocks replays)
// Body: { text: string, category?: string }
//
// The response is a per-link report the bot turns into embeds. Failures are
// per-link, not per-request, so one bad link never hides the others.

export const Route = createFileRoute("/api/discord-ingest")({
  server: {
    handlers: {
      // Explicit 405 so crawlers/health checks don't get the SPA fallback page.
      GET: async () =>
        new Response(JSON.stringify({ error: "Method not allowed — POST only" }), {
          status: 405,
          headers: { "Content-Type": "application/json", Allow: "POST" },
        }),
      POST: async ({ request }: { request: Request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for") ??
          "unknown";

        const json = (body: unknown, status: number) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
          });

        if (!(await isIngestConfigured())) {
          return json({ error: "Ingest endpoint is not configured" }, 503);
        }
        if (!(await checkIngestRateLimit(ip))) {
          return json({ error: "Rate limit exceeded — try again later" }, 429);
        }

        let raw = "";
        try {
          raw = await request.text();
        } catch {
          return json({ error: "Unreadable body" }, 400);
        }
        if (raw.length > 8000) return json({ error: "Body too large" }, 413);

        try {
          await verifyIngestSignature(
            raw,
            request.headers.get("x-signature"),
            request.headers.get("x-timestamp"),
          );
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Unauthorized" }, 401);
        }

        let payload: { text?: unknown; category?: unknown; ownerId?: unknown };
        try {
          payload = JSON.parse(raw) as typeof payload;
        } catch {
          return json({ error: "Body must be JSON" }, 400);
        }
        const text = typeof payload.text === "string" ? payload.text : "";
        const category = typeof payload.category === "string" ? payload.category : undefined;
        if (!text.trim()) return json({ error: "Empty text" }, 422);

        // The bot reports who is messaging so the Worker can DM that person for
        // things that happen unattended (nightly refresh, weekly digest).
        // Self-configuring: no user id to set by hand. Best-effort, and the
        // signature above already proves this came from the real bot.
        if (typeof payload.ownerId === "string") {
          await setOwnerDiscordId(payload.ownerId).catch(() => {});
        }

        const result = await ingestMessage(text, category);
        return json(result, 200);
      },
    },
  },
});
