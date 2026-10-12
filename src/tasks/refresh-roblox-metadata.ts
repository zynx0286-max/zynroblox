// Nightly Roblox metadata refresh, run by a Cloudflare cron trigger.
//
// Why it exists: a game the owner DM'd while Roblox was rate-limiting gets a
// placeholder title ("Roblox game <id>"), and Roblox renames games all the
// time. Rather than rely on someone noticing, this sweeps the portfolio once a
// night and fills in anything genuinely missing.
//
// SAFETY: this runs unattended, so it only ever fills EMPTY or placeholder
// fields. A curated title that differs from Roblox's is reported, never
// applied — the catalog ships "Engineria: Project X" while Roblox reports
// "Engineria Project X", and silently renaming curated work would be worse
// than being out of date. The rules live in lib/roblox-refresh.ts and are
// unit-tested; the admin panel's "Refresh from Roblox" button runs the exact
// same code, so the two can never disagree.
//
// Wiring: nitro({ experimental: { tasks: true }, scheduledTasks }) in
// vite.config.ts. Nitro adds the matching `crons` trigger to the generated
// .output/server/wrangler.json, which is the config actually deployed.

import { defineTask } from "nitro/task";
import { appendActivity, loadStore, mutate } from "../lib/store";
import { fetchRobloxMetadata, planRefresh, placeIdOf } from "../lib/roblox-refresh";

export default defineTask({
  meta: {
    name: "works:refresh",
    description: "Fill in missing Roblox titles, descriptions and icons for portfolio entries",
  },
  async run() {
    const store = await loadStore();
    const games = store.works.filter((w) => placeIdOf(w.href));
    // One return shape for both branches — a union here makes the task's
    // result type unusable.
    const empty = { checked: 0, filled: 0, renames: 0, unavailable: 0 };
    if (games.length === 0) {
      console.log("[refresh] no Roblox entries — nothing to do");
      return { result: empty };
    }

    const metaBySlug = await fetchRobloxMetadata(store.works, store.universeIds);
    const report = planRefresh(store.works, metaBySlug);

    if (report.filled.length > 0) {
      await mutate((s) => {
        for (const change of report.filled) {
          const work = s.works.find((w) => w.slug === change.slug);
          if (work) Object.assign(work, { [change.field]: change.to });
        }
        for (const [slug, meta] of metaBySlug) {
          if (!meta?.universeId) continue;
          const work = s.works.find((w) => w.slug === slug);
          const placeId = placeIdOf(work?.href);
          if (placeId) s.universeIds[placeId] = meta.universeId;
        }
      });
    }

    // Persisted to the activity log so the result is readable weeks later
    // (and summarised in the weekly digest), not just in a build log.
    await appendActivity([
      {
        at: new Date().toISOString(),
        kind: "refresh.ran",
        summary:
          `checked ${report.checked} · filled ${report.filled.length} · ` +
          `${report.renames.length} differ · ${report.unavailable.length} unavailable`,
        detail: {
          checked: report.checked,
          filled: report.filled.length,
          review: report.renames.length,
          unavailable: report.unavailable.length,
        },
      },
    ]);

    // Console too: `npx wrangler tail roblox` is the fastest way to see a run.
    console.log(
      `[refresh] checked ${report.checked} · filled ${report.filled.length} · ` +
        `renames needing review ${report.renames.length} · unavailable ${report.unavailable.length}`,
    );
    for (const change of report.filled) {
      console.log(`[refresh] filled ${change.slug}.${change.field}: ${change.reason}`);
    }
    for (const change of report.renames) {
      console.log(
        `[refresh] review ${change.slug}.${change.field}: ${change.from} vs ${change.to}`,
      );
    }

    return {
      result: {
        checked: report.checked,
        filled: report.filled.length,
        renames: report.renames.length,
        unavailable: report.unavailable.length,
      },
    };
  },
});
