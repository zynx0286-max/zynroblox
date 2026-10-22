// The cooldown between manual "send test DM" clicks.
//
// Pure on purpose: the admin panel counts down with these numbers and the server
// enforces the same ones, so the button re-enables exactly when another send
// would actually be allowed — not a second earlier, not a second later.

/** How long the owner must wait between test DMs. */
export const TEST_DIGEST_COOLDOWN_MS = 30_000;

/**
 * Milliseconds left before another test DM may go out; 0 means go ahead.
 *
 * A missing or unparseable timestamp means "never sent". A timestamp in the
 * future — the clock moved backwards, or another isolate wrote it — counts as
 * "just sent", so a skewed clock can't unlock the button early.
 */
export function cooldownRemainingMs(
  now: number,
  lastAt: number,
  cooldownMs: number = TEST_DIGEST_COOLDOWN_MS,
): number {
  if (!(cooldownMs > 0)) return 0;
  if (!Number.isFinite(lastAt) || lastAt <= 0) return 0;
  if (!Number.isFinite(now)) return cooldownMs;
  const elapsed = now - lastAt;
  if (elapsed < 0) return cooldownMs;
  return elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
}

/** Whole seconds to show in the button; rounded up so 1s never means "not yet". */
export function cooldownSeconds(remainingMs: number): number {
  if (!(remainingMs > 0)) return 0;
  return Math.ceil(remainingMs / 1000);
}
