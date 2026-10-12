// Reads a Worker secret, falling back to process.env for local dev.
//
// Lives in its own module (rather than private to store.ts) so the Discord
// notifier can resolve the same secrets without importing the store — which
// would drag the work catalog and its ~40 PNG assets into a cron task that has
// no business reading them.

/**
 * Workers expose bindings via `cloudflare:workers`; Node (local dev, scripts)
 * uses process.env. Empty string means "not set", never a throw — callers treat
 * every secret as optional.
 */
export async function readSecret(name: string): Promise<string> {
  try {
    const cf = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
      env?: Record<string, unknown>;
    };
    const value = cf?.env?.[name];
    if (typeof value === "string" && value.length > 0) return value;
  } catch {
    // Not on Workers — fall through to process.env.
  }
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
}
