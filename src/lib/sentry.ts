import * as Sentry from "@sentry/react";

/**
 * Sentry error tracking.
 *
 * The DSN is intentionally blank until a real project exists — add
 * `VITE_SENTRY_DSN` (and optionally `VITE_SENTRY_ENVIRONMENT`) and everything
 * below activates with no further code changes.
 */
const DSN = (import.meta.env["VITE_SENTRY_DSN"] as string | undefined) ?? "";

export const SENTRY_ENVIRONMENT =
  (import.meta.env["VITE_SENTRY_ENVIRONMENT"] as string | undefined) ??
  (import.meta.env.DEV ? "development" : "production");

let started = false;

export function initSentry() {
  if (started || !DSN || typeof window === "undefined") return;
  started = true;
  Sentry.init({
    dsn: DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
  });
}

export const sentryEnabled = () => Boolean(DSN);

/** Report an error with a tag describing where it came from. */
export function captureError(
  error: unknown,
  context: { area: "contact" | "route" | "admin" | "works"; [key: string]: unknown } = {
    area: "route",
  },
) {
  const { area, ...extra } = context;
  if (!DSN) {
    console.error(`[${area}]`, error, extra);
    return;
  }
  Sentry.captureException(error, {
    tags: { area, environment: SENTRY_ENVIRONMENT },
    extra,
  });
}
