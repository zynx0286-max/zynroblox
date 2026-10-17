// One-shot local patch: makes /__scheduled actually RUN the real Nitro cron
// task when --test-scheduled is on. Wrangler dev's test route expects the app
// to expose /__scheduled; this build has no such route, so we add one INSIDE
// the built worker that calls runCronTasks(controller.cron, ...) — identical
// to what the Worker's real scheduled() handler does on a cron tick.
//
// Guarded by NITRO_TEST_SCHEDULED=1 so it can't fire lazily from any dev
// accident; if the flag is off, /__scheduled keeps the old 404 behavior.
//
// Usage: node scripts/patch-test-scheduled.mjs
// Idempotent: skips when the marker is already in the file.
//
// PROVING A REAL DM (the procedure that actually worked, 2026-10):
//   1. cp .dev.vars .output/server/.dev.vars   <- CRITICAL: wrangler looks for
//      .dev.vars NEXT TO --config (.output/server/wrangler.json), not the repo
//      root; a repo-root copy alone leaves every secret empty and the notify
//      path logs `[notify][probe] no token` and returns sent=false.
//   2. NITRO_TEST_SCHEDULED=1 npx wrangler dev --config .output/server/wrangler.json
//   3. curl -X POST 'http://localhost:8788/__scheduled?cron=29+*+*+*+*'
//   4. Expect `[liveness] alert-down sent=true` in the wrangler log, and a new
//      message in the owner's DM channel. Proven pair: "🚨 Hosted bot is DOWN"
//      (msg 1561045105509531698, stale heartbeat) and "✅ Bot is back online"
//      (msg 1561062482720596149, after a fresh heartbeat + recovery tick).
//   5. REMOVE the .output/server/.dev.vars copy afterwards so secrets never
//      live inside build output. Rebuild regenerates index.mjs, so the patch
//      (and the injected route) disappears on the next build.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../.output/server/index.mjs", import.meta.url);
let src = readFileSync(FILE, "utf8");

if (src.includes("__NITRO_TEST_SCHEDULED_FALLBACK__")) {
  console.log("patch already applied — nothing to do");
  process.exit(0);
}

const ANCHOR = "createHandler({ fetch(cfRequest, env, context, url) {";
if (!src.includes(ANCHOR)) {
  console.error("anchor not found — build layout changed; re-point this patch");
  process.exit(2);
}

// The patched fetch handler runs the real cron task path synchronously and
// returns 200; a cron param of "29 * * * *" hits exactly the liveness watch.
const inject = ANCHOR.replace(
  "fetch(cfRequest, env, context, url) {",
  `async fetch(cfRequest, env, context, url) {
    if (url.pathname === "/__scheduled" && typeof process !== "undefined" && process.env.NITRO_TEST_SCHEDULED === "1") {
      const cron = url.searchParams.get("cron") ?? "29 * * * *";
      globalThis.__env__ = env;
      const evt = { context: { cloudflare: { env, context } }, payload: {} };
      try {
        await runCronTasks(cron, evt);
        return new Response("scheduled: " + cron, { status: 200 });
      } catch (err) {
        return new Response("scheduled error: " + (err?.stack ?? String(err)), { status: 500 });
      }
    } /* __NITRO_TEST_SCHEDULED_FALLBACK__ */`
);
src = src.replace(ANCHOR, inject);
writeFileSync(FILE, src);
console.log("patched .output/server/index.mjs — /__scheduled now runs runCronTasks under NITRO_TEST_SCHEDULED=1");
