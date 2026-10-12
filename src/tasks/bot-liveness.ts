// Hourly bot-liveness watch — turns the heartbeat into an ALERT.
//
//   npm run bot:doctor          → answers "is the bot alive?" on demand
//   this cron (every hour)      → tells YOU when the answer turns bad
//
// The heartbeat row (src/lib/bot-heartbeat.ts) records last-seen; this task
// evaluates it against the previous evaluation (src/lib/bot-liveness-rules.ts,
// pure and unit-tested) and DMs the owner exactly on transitions:
//
//   fresh → down : one alert (never 72 alerts for a 3-day outage — a slow
//                  re-alert ladder keeps long outages visible, not noisy)
//   down → fresh : one "it's back" alert, so silence becomes trustworthy
//
// State lives in its own aux row (zyn-bot-liveness-v1, same CAS protocol as
// everything else) so evaluations survive isolate restarts and can never
// double-page from two concurrent runs.

import { defineTask } from "nitro/task";
import { getBotHeartbeat, getBotLastLiveness, setBotLastLiveness } from "../lib/bot-heartbeat";
import {
  degradedAlertText,
  evaluateLiveness,
  livenessAlertText,
  type LivenessLastState,
} from "../lib/bot-liveness-rules";
import { notifyOwnerDm, type NotifyResult } from "../lib/discord-notify";
import { buildLivenessEmbed } from "../lib/notify-embeds";

export default defineTask({
  meta: {
    name: "portfolio:bot-liveness",
    description: "DM the owner when the hosted Discord bot goes dark or comes back",
  },
  async run(): Promise<{
    result: { action: string; reason: string; sent?: boolean; alerts?: number };
  }> {
    const nowMs = Date.now();
    const [heartbeat, last] = await Promise.all([getBotHeartbeat(), getBotLastLiveness()]);

    const { decision, next } = evaluateLiveness({
      nowMs,
      last,
      heartbeat: {
        lastSeenAt: heartbeat?.lastSeenAt ?? null,
        reconnects: heartbeat?.reconnects,
        dmErrors: heartbeat?.dmErrors,
      },
    });

    // Persist FIRST: an alert that fails to send must not cause a re-alert
    // loop, and a run that crashes after alerting must count its alert.
    await setBotLastLiveness(next);

    if (decision.action === "none") {
      console.log(`[liveness] quiet — ${decision.reason}`);
      return { result: { action: "none", reason: decision.reason } };
    }

    const text = livenessAlertText(decision) ?? degradedAlertText(decision) ?? "";
    const embed = buildLivenessEmbed(decision, text);
    const sent = await notifyOwnerDm(embed);

    console.log(`[liveness] ${decision.action} sent=${sent.sent} — ${decision.reason}`);
    return {
      result: {
        action: decision.action,
        sent: sent.sent,
        reason: decision.reason,
        alerts: next.alerts,
      },
    };
  },
});

export type { LivenessLastState };
