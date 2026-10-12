// Pure state machine for the bot's remote liveness alerts.
//
// The heartbeat row (src/lib/bot-heartbeat.ts) already answers "is the bot
// alive RIGHT NOW" — the doctor asks it on demand. This module adds the part
// nobody was watching for: deciding WHEN that answer is worth interrupting
// the owner for, and remembering which side of the line we last reported
// from, so the same state never pages the owner twice.
//
// Rules (all pure, testable — this file has zero imports, same split as
// bot-heartbeat-rules.ts):
//
//   fresh  → down   : FIRST time a heartbeat goes stale, alert. Never again
//                     until it recovers — 3 days of downtime must not page
//                     72 times.
//   backoff         : while still down, re-alert on a slow rising ladder
//                     (24h, 48h, 96h…) so a long outage stays visible without
//                     becoming noise.
//   down   → fresh  : recovery alert exactly once, noting how long it was
//                     dark. Two-sided alerting matters: without the
//                     "came back" message the owner can't trust silence.
//
// The alert decision is only made by ONE cron task (portfolio:bot-liveness),
// so two schedulers can't double-page.

/** Consider the bot down when the last heartbeat is older than this (30 min — the bot pings every 5). */
export const DOWN_AFTER_MS = 30 * 60 * 1000;

/** Re-alert ladder while still down: hours since the LAST alert per rung. */
const REPEAT_LADDER_HOURS = [24, 48, 96];

/**
 * FLAPPING: a bot that dies and reappears every few minutes fires the
 * down/recovered pair on a loop — two DMs per cycle, forever, which trains
 * the owner to ignore exactly the alerts that matter. The fix:
 *
 *   - Inside the cooldown window after a SHORT recovery, further recovery
 *     alerts are SUPPRESSED (state still tracks them in `flaps`).
 *   - At FLAP_PAGE_THRESHOLD flaps, ONE crash-loop page replaces the drip:
 *     "it is restarting over and over", which is the actionable truth.
 *   - A long stable stretch resets the counter.
 */
export const FLAP_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h window after a short blip
export const FLAP_PAGE_THRESHOLD = 4;
/**
 * Max dark-for time a blip can show on an hourly watch: the outage plus one
 * cron tick of detection latency. Anything longer stays a real outage.
 */
export const FLAP_MAX_DARK_MS = 90 * 60 * 1000;

/**
 * Degraded = pinging (fresh heartbeat) but struggling: at least 3 gateway
 * reconnects since start or ANY failed DM reply. The reconnect threshold
 * tolerates a couple of transient host blips; one failed DM reply is already
 * an owner-visible failure.
 */
export const DEGRADED_MIN_RECONNECTS = 3;
export function isDegraded(hb: Partial<Pick<HeartbeatInput, "reconnects" | "dmErrors">>): boolean {
  return (hb.reconnects ?? 0) >= DEGRADED_MIN_RECONNECTS || (hb.dmErrors ?? 0) > 0;
}

export type LivenessLastState = {
  /** "fresh" = last evaluated as alive; "down" = last evaluated as dead. */
  side: "fresh" | "down";
  /** Worker wall clock (ms) of that evaluation. */
  at: number;
  /** When the current (or most recent) outage started. Set on transition to down. */
  downSince?: number;
  /** How many times we have alerted for the current outage. */
  alerts: number;
  /** Set when the bot pings but its gateway is degrading (reconnects/dmErrors). */
  degradedSince?: number;
  /**
   * Recovery-outages inside the cooldown window (see FLAP_COOLDOWN_MS).
   * Each recovery-into-this-window with a SHORT dark period increments; a
   * long stable stretch resets it. Short = within FLAP_MAX_DARK_MS (outage
   * plus one cron tick of detection latency).
   */
  flaps: number;
};

export type HeartbeatInput = {
  /** Worker clock (ms) of the last heartbeat received, or null = never pinged. */
  lastSeenAt: number | null;
  /** Gateway health telemetry carried by the latest heartbeat (optional pre-telemetry rows). */
  reconnects?: number | undefined;
  dmErrors?: number | undefined;
};

export type EvaluationInput = {
  nowMs: number;
  last: LivenessLastState | null;
  heartbeat: HeartbeatInput;
};

export type LivenessDecision =
  | { action: "none"; reason: string }
  | {
      action: "alert-down";
      reason: string;
      /** Minutes the bot has been dark. */
      downForMinutes: number;
      /** True when this is the FIRST alert for this outage. */
      first: boolean;
    }
  | {
      action: "alert-recovered";
      reason: string;
      /** Minutes the outage lasted, from downSince to now. */
      darkForMinutes: number;
    }
  | {
      action: "alert-degraded";
      reason: string;
      /** What the telemetry looks like ("4 reconnect(s), 2 DM error(s)"). */
      detail: string;
    }
  | {
      action: "alert-degraded-recovered";
      reason: string;
      /** Hours the degradation lasted, from degradedSince to now. */
      hours: number;
    }
  | {
      action: "alert-crash-loop";
      reason: string;
      /** Recovery-outages counted inside the cooldown window. */
      flaps: number;
    };

/**
 * One evaluation of the cron tick. Pure: same inputs always yield the same
 * decision. The caller persists `next` (written in the task) afterwards.
 */
export function evaluateLiveness(input: EvaluationInput): {
  decision: LivenessDecision;
  next: LivenessLastState;
} {
  const { nowMs, last, heartbeat } = input;
  const isDown =
    heartbeat.lastSeenAt === null ||
    !Number.isFinite(heartbeat.lastSeenAt) ||
    nowMs - heartbeat.lastSeenAt >= DOWN_AFTER_MS;

  // No prior state: first-ever evaluation. Establish silently unless the bot
  // is ALREADY down or visibly degrading — a task deployed onto a sick bot
  // should say so rather than adopt the problem quietly.
  if (!last) {
    if (isDown) {
      const downForMinutes = heartbeat.lastSeenAt
        ? Math.floor((nowMs - heartbeat.lastSeenAt) / 60_000)
        : null;
      return {
        decision: {
          action: "alert-down",
          reason: "first evaluation, bot already dark",
          downForMinutes: downForMinutes ?? -1,
          first: true,
        },
        next: {
          side: "down",
          at: nowMs,
          downSince: heartbeat.lastSeenAt ?? nowMs,
          alerts: 1,
          flaps: 0,
        },
      };
    }
    if (isDegraded(heartbeat)) {
      return {
        decision: {
          action: "alert-degraded",
          reason: "first evaluation, bot already degrading",
          detail: degradedDetail(heartbeat),
        },
        next: { side: "fresh", at: nowMs, alerts: 0, degradedSince: nowMs, flaps: 0 },
      };
    }
    return {
      decision: { action: "none", reason: "first evaluation, bot fresh" },
      next: { side: "fresh", at: nowMs, alerts: 0, flaps: 0 },
    };
  }

  if (isDown) {
    // TRANSITION: was reported fresh, now dark. The one alert that matters.
    if (last.side === "fresh") {
      // (degradedSince dropped: recovery-from-down cleans state and the
      // outage itself is the louder signal)
      return {
        decision: {
          action: "alert-down",
          reason: "heartbeat went stale",
          downForMinutes: heartbeat.lastSeenAt
            ? Math.floor((nowMs - heartbeat.lastSeenAt) / 60_000)
            : -1,
          first: true,
        },
        next: {
          side: "down",
          at: nowMs,
          downSince: heartbeat.lastSeenAt ?? nowMs,
          alerts: 1,
          // KEEP the flap count across outages: the whole point of the counter
          // is to accumulate PATTERN evidence across cycles. Resetting it here
          // is why a crash-loop pages "recovered" forever without ever
          // escalating. Cleared only by the cooldown-expiry rule below.
          flaps: last.flaps,
        },
      };
    }
    // Already down: stay quiet inside the ladder, re-alert on the rung.
    const hoursSinceAlert = (nowMs - last.at) / 3_600_000;
    const rungIndex = Math.min(last.alerts - 1, REPEAT_LADDER_HOURS.length - 1);
    const dueAfter = REPEAT_LADDER_HOURS[rungIndex] ?? REPEAT_LADDER_HOURS[0] ?? 24;
    if (hoursSinceAlert >= dueAfter) {
      return {
        decision: {
          action: "alert-down",
          reason: `still down after ~${dueAfter}h — periodic re-alert`,
          downForMinutes: heartbeat.lastSeenAt
            ? Math.floor((nowMs - heartbeat.lastSeenAt) / 60_000)
            : -1,
          first: false,
        },
        next: {
          side: "down",
          at: nowMs,
          ...(last.downSince !== undefined ? { downSince: last.downSince } : {}),
          alerts: last.alerts + 1,
          flaps: last.flaps,
        },
      };
    }
    return {
      decision: { action: "none", reason: `already down; next re-alert after ~${dueAfter}h` },
      next: last,
    };
  }

  // Heartbeat is fresh. Recovery-from-down is evaluated FIRST: the one
  // "it's back" alert must not be swallowed by a degraded-transition page —
  // recovering into trouble pages recovery now, with degradation kept on
  // state so the next tick still delivers the degraded note.
  if (last.side === "down") {
    // TRANSITION: came back.
    const darkForMinutes =
      last.downSince !== undefined ? Math.floor((nowMs - last.downSince) / 60_000) : -1;
    const base = {
      side: "fresh" as const,
      at: nowMs,
      alerts: 0,
    };
    // FLAP SUPPRESSION: a short blackout inside the cooldown window after
    // another short blackout is part of a repeating pattern, not news. The
    // counter rides on state; at the threshold it becomes ONE crash-loop
    // page. A long stable stretch clears flaps (see the healthy branch).
    //
    // WHAT A "SHORT" BLACKOUT IS, given hourly cron: darkForMinutes measures
    // from downSince (the stale heartbeat's own clock) — it INCLUDES the cron
    // detection delay, so a 30-second outage already reads as "35 min dark" at
    // the next tick. The observable distinction on an hourly watch is not
    // outage LENGTH but recovery SPEED: a blip is an outage that recovers
    // within ONE cron tick of its down alert (≤ 90 min), versus a real outage
    // that stays dark across several ticks.
    const shortBlip = darkForMinutes >= 0 && darkForMinutes * 60_000 <= FLAP_MAX_DARK_MS;
    const withinCooldown = last.at + FLAP_COOLDOWN_MS >= nowMs;
    const flaps = shortBlip && withinCooldown ? last.flaps + 1 : shortBlip ? 1 : 0;
    if (shortBlip && flaps >= FLAP_PAGE_THRESHOLD) {
      return {
        decision: {
          action: "alert-crash-loop",
          reason: `${flaps} short blackouts inside the cooldown window`,
          flaps,
        },
        next: { ...base, flaps: 0 }, // page replaces the drip; start counting a new cycle
      };
    }
    // Recovered INTO a degrading gateway: keep the degraded page due for the
    // next tick rather than losing half the signal.
    const suppress = shortBlip && withinCooldown && flaps > 1;
    if (isDegraded(heartbeat)) {
      return {
        decision: suppress
          ? {
              action: "none",
              reason: "short blip inside flap cooldown; degraded note due next tick",
            }
          : {
              action: "alert-recovered",
              reason: "heartbeat is fresh again (but the gateway is still degraded)",
              darkForMinutes,
            },
        next: { ...base, flaps, degradedSince: nowMs },
      };
    }
    return {
      decision: suppress
        ? { action: "none", reason: `short blip #${flaps} inside flap cooldown` }
        : {
            action: "alert-recovered",
            reason: "heartbeat is fresh again",
            darkForMinutes,
          },
      next: { ...base, flaps },
    };
  }
  const wasDegraded = last.degradedSince !== undefined;

  if (isDegraded(heartbeat)) {
    if (wasDegraded) {
      return {
        decision: { action: "none", reason: "already degrading; one alert is enough" },
        next: last,
      };
    }
    // TRANSITION fresh+healthy → degraded: one advisory page.
    return {
      decision: {
        action: "alert-degraded",
        reason: "heartbeat fresh but the gateway is struggling",
        detail: degradedDetail(heartbeat),
      },
      next: { side: "fresh", at: nowMs, alerts: 0, degradedSince: nowMs, flaps: last.flaps },
    };
  }
  if (wasDegraded) {
    // TRANSITION degraded → healthy: one "it settled down" note.
    return {
      decision: {
        action: "alert-degraded-recovered",
        reason: "gateway health returned to normal",
        hours: Math.max(0, (nowMs - (last.degradedSince ?? nowMs)) / 3_600_000),
      },
      next: { side: "fresh", at: nowMs, alerts: 0, flaps: last.flaps },
    };
  }
  // Healthy tick with a stale flap history: a long quiet stretch clears the
  // counter (3h in, no new blackouts — the pattern is over).
  const cooldownExpiry = last.at + FLAP_COOLDOWN_MS;
  if (last.flaps > 0 && cooldownExpiry < nowMs) {
    return {
      decision: { action: "none", reason: "flap counter expired" },
      next: { ...last, flaps: 0 },
    };
  }
  return { decision: { action: "none", reason: "fresh and previously fresh" }, next: last };
}

/** "{4} reconnect(s), {2} DM error(s)" — only what the telemetry actually shows. */
function degradedDetail(hb: HeartbeatInput): string {
  const parts: string[] = [];
  if ((hb.reconnects ?? 0) > 0) parts.push(`${hb.reconnects} reconnect(s)`);
  if ((hb.dmErrors ?? 0) > 0) parts.push(`${hb.dmErrors} DM error(s)`);
  return parts.join(", ") || "gateway struggling";
}

/**
 * Pure: builds the text a DM would carry for a decision. Kept here rather
 * than notify-embeds so embed builders stay Discord-shaped and this stays
 * decision-shaped; the task composes the two.
 */
export function livenessAlertText(decision: LivenessDecision): string | null {
  if (decision.action === "none") return null;
  if (decision.action === "alert-recovered") {
    return decision.darkForMinutes >= 0
      ? `The bot came back after a ${decision.darkForMinutes < 60 ? `${decision.darkForMinutes} min` : `${Math.floor(decision.darkForMinutes / 60)}h`} dim. It is answering DMs again.`
      : "The bot came back — it is answering DMs again.";
  }
  if (decision.action === "alert-degraded" || decision.action === "alert-degraded-recovered") {
    return degradedAlertText(decision);
  }
  if (decision.action === "alert-crash-loop") {
    return `The bot has ${decision.flaps} blackouts inside ${FLAP_COOLDOWN_MS / 3_600_000}h — it is restarting over and over, not staying up. Check the host console for the crash cause; further recovery notices for this pattern are suppressed until it holds.`;
  }
  const first = decision.first ? "" : " (still down — periodic re-check)";
  const howLong =
    decision.downForMinutes >= 0 ? ` (last heartbeat ${decision.downForMinutes} min ago)` : "";
  return `The hosted bot looks DOWN${first}${howLong}. DMs will go unanswered until it restarts — check the Wispbyte console, then verify with npm run bot:doctor.`;
}

/** Text for the degraded / degraded-recovered decisions (down text lives above). */
export function degradedAlertText(decision: LivenessDecision): string | null {
  if (decision.action === "alert-degraded") {
    return `The bot is up but struggling: ${decision.detail}. DMs may be slow or fail — keep an eye on it; the outage alarm still applies if it goes dark.`;
  }
  if (decision.action === "alert-degraded-recovered") {
    const when = decision.hours >= 1 ? ` after ~${Math.round(decision.hours)}h` : "";
    return `The bot settled down${when} — reconnects and DM failures have stopped. Everything is answering normally again.`;
  }
  return null;
}

/**
 * One-line summary for the weekly digest. Pure: takes the state on disk (may
 * be corrupt/absent) and answers "is anything wrong right now?" without
 * blocking or inventing news — a healthy week yields null, which the embed
 * omits entirely. Degradation reads as a warning line; a full outage wins.
 */
export function livenessDigestLine(state: LivenessLastState | null, nowMs: number): string | null {
  if (!state) return null;
  if (state.side === "down") {
    const when = state.downSince
      ? ` since ${new Date(state.downSince).toISOString().slice(0, 10)}`
      : "";
    return `🚨 Bot currently DOWN${when} — answering no DMs.`;
  }
  if (state.degradedSince !== undefined) {
    const days = Math.floor((nowMs - state.degradedSince) / 86_400_000);
    const when = days >= 1 ? ` for ~${days} day(s)` : "";
    return `⚠️ Bot degraded${when} — pinging the Worker but reconnects/DM errors are happening.`;
  }
  return null;
}
