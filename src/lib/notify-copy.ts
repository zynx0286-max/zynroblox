// The sentences the maintenance panel shows about a test digest send.
//
// Pure and separate from the component because this is the part that has to be
// right: a vague failure ("not sent") leaves the owner with nothing to fix,
// while the wrong failure sends them hunting the wrong setting. The transport
// reasons are deliberately terse (they also go to logs); this is where they
// become an action.

import { relativeTime } from "./relative-time.ts";

/**
 * The thing to fix behind a transport reason. Unknown reasons are shown as-is
 * rather than swallowed — a new reason should be visible, not invisible.
 */
export function describeTestReason(reason: string): string {
  switch (reason) {
    case "not configured":
      return "no Discord bot token is configured (set DISCORD_BOT_TOKEN first)";
    case "muted or no owner registered":
      return "notifications are muted or the bot hasn't registered your Discord id yet (DM the bot once)";
    case "no DM channel with the bot yet":
      return "the bot has no DM with you yet (message it once, then try again)";
    case "discord error":
      return "Discord rejected the message (check the bot token and that the bot can DM you)";
    default:
      return reason;
  }
}

/** The stored outcome of the most recent test DM. */
export type LastTestSummary = {
  /** Epoch milliseconds of the attempt. */
  at: number;
  sent: boolean;
  /** Transport reason when it failed. */
  reason?: string;
};

/**
 * One line of history under the digest preview: "Last test 4 minutes ago —
 * delivered to your DMs." or the reason it didn't go out.
 */
export function lastTestLine(lastTest: LastTestSummary, nowMs: number = Date.now()): string {
  const when = relativeTime(lastTest.at, nowMs);
  if (lastTest.sent) return `Last test ${when} — delivered to your DMs.`;
  const reason = lastTest.reason ? describeTestReason(lastTest.reason) : "no reason was recorded";
  return `Last test ${when} — not sent: ${reason}.`;
}
