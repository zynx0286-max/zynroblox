/**
 * Error tracking.
 *
 * Swapped to a zero-dependency implementation: the full Sentry SDK was never
 * initialized (no DSN configured, `initSentry()` called nowhere), so it only
 * added dead weight to every page bundle. If a real Sentry project is added
 * later, restore `@sentry/react` here and call `initSentry()` from the app
 * entry (e.g. `src/start.ts` / `__root.tsx`).
 */
const DSN = (import.meta.env["VITE_SENTRY_DSN"] as string | undefined) ?? "";

export const SENTRY_ENVIRONMENT =
  (import.meta.env["VITE_SENTRY_ENVIRONMENT"] as string | undefined) ??
  (import.meta.env.DEV ? "development" : "production");

export function initSentry() {
  // No-op. The SDK was never wired up — this exists to keep the call-site API.
}

export const sentryEnabled = () => Boolean(DSN);

/** Report an error with a tag describing where it came from. */
export function captureError(
  error: unknown,
  context: { area: "contact" | "route" | "admin" | "works" | "reviews"; [key: string]: unknown } = {
    area: "route",
  },
) {
  const { area, ...extra } = context;
  if (DSN) {
    // DSN configured but SDK not loaded — surface it loudly instead of silently
    // swallowing so it doesn't look like the error was reported.
    console.error(`[sentry:not-initialized][${area}]`, error, extra);
    return;
  }
  console.error(`[${area}]`, error, extra);
}
