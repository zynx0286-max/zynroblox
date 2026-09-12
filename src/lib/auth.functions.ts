import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, setCookie } from "@tanstack/react-start/server";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  COOKIE_NAME,
  createSessionToken,
  getAdminPassword,
  getCookieOptions,
  isAdminPasswordConfigured,
} from "@/lib/owner-session";
import { checkAdminLocation } from "@/lib/admin-geo";

// Owner-only admin gate. The password never ships to the browser — it is
// checked here on the server and MUST be set via the `ADMIN_PASSWORD` secret
// (Cloudflare dashboard → Variables and Secrets). There is no default: if it
// isn't configured, every login attempt fails closed.
//
// Sign-in is additionally geo-fenced to Franklin Township, NJ + nearby
// (see admin-geo.ts; emergency kill switch: ADMIN_GEO_ENFORCE=off).
const OWNER_USERNAME = "zynx0286";
const OWNER_EMAIL = "zynx0286@gmail.com";

const credentialsSchema = z.object({
  username: z.string().trim().min(2).max(120),
  password: z.string().min(1).max(200),
});

type LoginResult = { ok: boolean; reason?: "credentials" | "location" | "unconfigured" };

async function slowReject(reason: NonNullable<LoginResult["reason"]>): Promise<LoginResult> {
  // Constant-time-ish delay so rejects don't leak which check failed quickly.
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
  return { ok: false as const, reason };
}

// Brute-force guard: max 8 login attempts per IP per 10 minutes. Failed and
// successful attempts both count — exceeding it returns a generic credentials
// failure so the limit itself isn't leaked to scanners.
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const loginHits = new Map<string, number[]>();

function loginRateLimited(key: string) {
  const now = Date.now();
  const recent = (loginHits.get(key) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  recent.push(now);
  loginHits.set(key, recent);
  if (loginHits.size > 500) {
    for (const [k, v] of loginHits) if (!v.some((t) => now - t < LOGIN_WINDOW_MS)) loginHits.delete(k);
  }
  return recent.length > LOGIN_LIMIT;
}

export const loginOwner = createServerFn({ method: "POST" })
  .validator((data: unknown) => credentialsSchema.parse(data))
  .handler(async ({ data }): Promise<LoginResult> => {
    // 0. Brute-force guard — before anything else.
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    if (loginRateLimited(ip)) {
      return slowReject("credentials");
    }

    // 1. Location fence — before touching credentials.
    const geo = await checkAdminLocation();
    if (!geo.allowed) {
      return slowReject("location");
    }

    // 2. Fail closed when no password is configured (never accept anything).
    if (!(await isAdminPasswordConfigured())) {
      console.error("[auth] login attempted with no ADMIN_PASSWORD configured");
      return slowReject("unconfigured");
    }

    const username = data.username.trim().toLowerCase();
    const isOwnerUser = username === OWNER_USERNAME || username === OWNER_EMAIL.toLowerCase();
    const isOwnerPassword = data.password === (await getAdminPassword());

    if (!isOwnerUser || !isOwnerPassword) {
      return slowReject("credentials");
    }

    setCookie(COOKIE_NAME, await createSessionToken(), getCookieOptions());
    return { ok: true as const };
  });

export const logoutOwner = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE_NAME, getCookieOptions());
  return { ok: true as const };
});
