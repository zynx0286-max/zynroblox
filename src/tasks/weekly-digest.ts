// Sends the weekly portfolio digest to the owner on Discord.
//
// Runs Mondays at 08:43 UTC. It reads the activity log written by the bot, the
// CLI and the nightly refresh, and summarises the last 7 days: what went live,
// what still needs a human, and what Roblox disagrees with.
//
// Quiet weeks are skipped entirely. A "nothing happened" DM every Monday trains
// you to ignore the channel, which costs more than the one it saves.

import { defineTask } from "nitro/task";
import { getActivity } from "../lib/store";
import { buildDigest } from "../lib/digest";
import { notifyOwnerDm, buildDigestEmbed } from "../lib/discord-notify";
import { getBotHeartbeat, getBotLastLiveness } from "../lib/bot-heartbeat";
import { readSecret } from "../lib/read-secret";

export default defineTask({
  meta: {
    name: "portfolio:digest",
    description: "Weekly DM summarising new entries, merges and refresh results",
  },
  async run() {
    const now = new Date();
    const entries = await getActivity();
    const digest = buildDigest(entries, now, 7);

    if (digest.quiet) {
      console.log("[digest] quiet week — not sending");
      // One return shape for both branches — a union makes the task result
      // type unusable.
      return {
        result: {
          sent: false,
          reason: "quiet",
          added: 0,
          needsAttention: 0,
          merges: 0,
          refreshes: 0,
          review: 0,
        },
      };
    }

    // The site URL lives in the catalog; read it from the store instead of
    // importing it so this task stays decoupled from the asset graph.
    const siteUrl = (await readSecret("SITE_URL")) || "https://roblox.zynx0286.workers.dev";
    const [state, heartbeat] = await Promise.all([getBotLastLiveness(), getBotHeartbeat()]);
    const liveness = { state, heartbeat, nowMs: Date.now() };
    const result = await notifyOwnerDm(buildDigestEmbed(digest, siteUrl, liveness));

    console.log(
      `[digest] sent=${result.sent} added=${digest.completed.length + digest.needsAttention.length} ` +
        `attention=${digest.needsAttention.length} merges=${digest.merges.length} ` +
        `refreshes=${digest.refreshes.length} review=${digest.reviewSuggested.length}`,
    );

    return {
      result: {
        sent: result.sent,
        reason: result.reason ?? "unknown",
        added: digest.completed.length,
        needsAttention: digest.needsAttention.length,
        merges: digest.merges.length,
        refreshes: digest.refreshes.length,
        review: digest.reviewSuggested.length,
      },
    };
  },
});
