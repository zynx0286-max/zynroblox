// Turns a timestamp into the phrase a person would say out loud.
//
// Pure and tiny on purpose: the admin panel renders these labels on every tick
// of the digest countdown, and tests pin the boundaries so "1 minute ago" never
// becomes "0 minutes ago" or "12 minutes ago" when it was 12.4.

const MINUTE = 60_000;

/**
 * "just now", "4 minutes ago", "3 hours ago", "2 days ago".
 *
 * A timestamp in the future (clock skew between the browser and the Worker) reads
 * as "just now" rather than a negative age.
 */
export function relativeTime(fromMs: number, nowMs: number = Date.now()): string {
  if (!Number.isFinite(fromMs)) return "at an unknown time";
  const age = nowMs - fromMs;
  if (!(age >= MINUTE / 2)) return "just now";
  // Floor, but never zero: the half-minute mark is already "a minute ago", and
  // "0 minutes ago" reads like a bug.
  const minutes = Math.max(1, Math.floor(age / MINUTE));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
