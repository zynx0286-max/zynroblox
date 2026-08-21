type EventName =
  | "contact_submit"
  | "contact_success"
  | "contact_error"
  | "discord_click"
  | "email_click"
  | "work_view"
  | "work_external_click"
  | "cta_click"
  | "contact_gmail_opened";

type Props = Record<string, string | number | boolean | undefined>;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  plausible?: (event: string, opts?: { props?: Props }) => void;
  __zynEvents?: { name: EventName; props: Props; at: number }[];
};

/**
 * Lightweight conversion tracking. Sends to whichever analytics provider is
 * present on the page (GA4, GTM dataLayer, Plausible) and always keeps a local
 * in-memory trail so events can be inspected without a provider installed.
 */
export function track(name: EventName, props: Props = {}) {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;

  const payload = { name, props, at: Date.now() };
  w.__zynEvents = [...(w.__zynEvents ?? []).slice(-49), payload];

  try {
    w.dataLayer?.push({ event: name, ...props });
    w.gtag?.("event", name, props);
    w.plausible?.(name, { props });
  } catch {
    /* analytics must never break the UI */
  }
}

/** Convenience props for outbound conversion links. */
export const trackClick =
  (name: EventName, props: Props = {}) =>
  () =>
    track(name, props);
