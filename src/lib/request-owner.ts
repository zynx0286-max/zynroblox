// "Is the current request signed in as the owner?" for reads that used to be
// strictly public (listings, work pages). requireOwner throws for admin
// mutations; public pages instead render drafts *for the owner only*, so they
// need a boolean they can branch on.
//
// Two entry points: `isOwnerRequest()` for server functions (cookie via the
// framework's request context, which is also available during SSR), and
// `hasOwnerSession(request)` for raw Request handlers such as /uploads, where
// reading the header first avoids depending on that context.

import { getCookie } from "@tanstack/react-start/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/owner-session";

/** True when the in-flight request carries a valid owner session cookie. */
export async function isOwnerRequest(): Promise<boolean> {
  try {
    const token = getCookie(COOKIE_NAME) ?? null;
    return token ? await verifySessionToken(token) : false;
  } catch {
    // No request context (build, cron task, prerender) — treat as anonymous.
    return false;
  }
}

/** Same check for a handler that already has its `Request`. */
export async function hasOwnerSession(request: Request): Promise<boolean> {
  const header = request.headers.get("cookie") ?? "";
  const match = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`).exec(header);
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (token) return verifySessionToken(token);
  return isOwnerRequest();
}
