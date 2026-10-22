// The sentences the maintenance panel shows about a test digest send.
//
// Pure and separate from the component because this is the part that has to be
// right: a vague failure ("not sent") leaves the owner with nothing to fix,
// while the wrong failure sends them hunting the wrong setting. The transport
// reasons are deliberately terse (they also go to logs); this is where they
// become an action.

import { relativeTime } from "./relative-time.ts";

/**
 * Where the fix instructions live. The repo is public, so the rendered docs are
 * one click away from the panel that reports the problem — no copying error text
 * into a search box and hoping.
 */
const DOCS_BASE = "https://github.com/zynx0286-max/zynroblox/blob/main/docs";
const BOT_DOCS = `${DOCS_BASE}/discord-bot.md`;

/** A link that takes the owner to the instructions for a failed send. */
export type FixLink = { label: string; href: string };

/**
 * The thing to fix behind a transport reason. Unknown reasons are shown as-is
 * rather than swallowed — a new reason should be visible, not invisible.
 */
export function describeTestReason(reason: string): string {
  switch (reason) {
    case "not configured":
      return "no Discord bot token is configured (set DISCORD_BOT_TOKEN first)";
    case "muted":
      return "proactive notifications are muted";
    case "no owner registered":
      return "the bot hasn't registered your Discord id yet (DM the bot once)";
    // Kept for records written before the two causes were told apart.
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

/**
 * The instructions for a failed send, or null when there is nothing useful to
 * link to. Reasons are matched exactly so a new one fails visible (no link)
 * rather than silently pointing at the wrong page.
 */
export function testReasonFix(reason?: string): FixLink | null {
  switch (reason) {
    case "not configured":
      return { label: "Set up the bot token", href: `${BOT_DOCS}#one-time-setup-5-minutes` };
    case "muted":
      return {
        label: "How to unmute",
        href: `${DOCS_BASE}/maintenance.md#notifications`,
      };
    case "no owner registered":
      return { label: "Register your Discord id", href: `${BOT_DOCS}#one-time-setup-5-minutes` };
    case "no DM channel with the bot yet":
      return { label: "Open the bot DM steps", href: `${BOT_DOCS}#one-time-setup-5-minutes` };
    case "muted or no owner registered":
      return { label: "Notification setup", href: `${BOT_DOCS}#one-time-setup-5-minutes` };
    case "discord error":
      return { label: "Discord troubleshooting", href: `${BOT_DOCS}#troubleshooting` };
    default:
      return null;
  }
}

/**
 * Label for the retry action beside a failed test line. It counts down rather
 * than sitting disabled with no explanation, and in-flight wins over the
 * cooldown so the click is acknowledged immediately.
 */
export function retryTestLabel(pending: boolean, cooldownLeft: number): string {
  if (pending) return "Retrying…";
  if (cooldownLeft > 0) return `Retry in ${cooldownLeft}s`;
  return "Retry test DM";
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
