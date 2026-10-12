import { createFileRoute } from "@tanstack/react-router";
import {
  formatLastSeen,
  getBotHeartbeat,
  healthIsDegraded,
  recordBotHeartbeat,
} from "@/lib/bot-heartbeat";
import { isIngestConfigured, verifyIngestSignature } from "@/lib/ingest-auth";

// POST /api/bot-heartbeat — remote liveness for the hosted Discord bot.
//
// The running bot POSTs here every ~5 minutes, same HMAC headers as the
// ingest endpoint (shared DISCORD_BOT_SECRET, ±5min replay window). The
// Worker records the last-seen time in `zyn-bot-heartbeat-v1` — see
// src/lib/bot-heartbeat.ts for why.
//
// GET reports the last-seen time in plain text, so `npm run bot:doctor`
// (which holds the same secret) can answer "is the bot actually alive?"
// without touching a hosting panel.
//
// This is DIAGNOSTICS, not a control plane: writes coalesce, failures are
// silent, and GET is harmless. Endpoints are closed when the secret is unset,
// exactly like the ingest route.

export const Route = createFileRoute("/api/bot-heartbeat")({
  server: {
    handlers: {
      GET: async () => {
        // The last-seen value reveals nothing secret by itself, but closing
        // GET when the secret is unset keeps the whole diagnostics surface
        // consistent: no DISCORD_BOT_SECRET, no endpoint, exactly like ingest.
        if (!(await isIngestConfigured())) {
          return new Response("diagnostics disabled\n", { status: 503 });
        }
        const hb = await getBotHeartbeat();
        const label = formatLastSeen(hb, Date.now());
        const degraded = hb && healthIsDegraded(hb) ? " — DEGRADED" : "";
        return new Response(`bot last heartbeat${degraded}: ${label}\n`, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
      },
      POST: async ({ request }: { request: Request }) => {
        const json = (body: string, status: number) =>
          new Response(body, {
            status,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });

        if (!(await isIngestConfigured())) return json("diagnostics disabled\n", 503);

        let raw = "";
        try {
          raw = await request.text();
        } catch {
          return json("unreadable body\n", 400);
        }
        if (raw.length > 512) return json("body too large\n", 413);

        try {
          await verifyIngestSignature(
            raw,
            request.headers.get("x-signature"),
            request.headers.get("x-timestamp"),
          );
        } catch (error) {
          return json(`${error instanceof Error ? error.message : "Unauthorized"}\n`, 401);
        }

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return json("body must be JSON\n", 400);
        }
        await recordBotHeartbeat(payload);
        return json("ok\n", 200);
      },
    },
  },
});
