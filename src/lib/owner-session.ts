// Cookie-based owner session. Login verifies the site password on the server
// and issues a signed, httpOnly cookie; every admin server function validates
// it via `requireOwner`. Uses only Web-standard APIs so it runs in browsers,
// Node and serverless runtimes with no native dependencies.
//
// SECURITY: the password comes ONLY from the `ADMIN_PASSWORD` env var /
// secret. There is deliberately no default — if it isn't configured, login
// always fails. Set it in the Cloudflare dashboard (Workers & Pages →
// Settings → Variables and Secrets) and never commit it to git.

export const COOKIE_NAME = "zyn_session";

const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Per-boot fallback secret so session tokens can never be forged with an
// empty/missing password. Login itself is still blocked when no password is
// configured (see auth.functions). Generated lazily — Workers forbid
// randomness (and other async I/O) in module global scope.
let bootSecret: string | undefined;
function getBootSecret(): string {
  if (!bootSecret) bootSecret = crypto.randomUUID();
  return bootSecret;
}

/** Reads a server secret from the Workers env first, then Node-style env. */
async function readSecret(name: string): Promise<string> {
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

/** The configured admin password, or "" when none is set (login disabled). */
export async function getAdminPassword(): Promise<string> {
  return readSecret("ADMIN_PASSWORD");
}

export async function isAdminPasswordConfigured(): Promise<boolean> {
  return (await getAdminPassword()).length > 0;
}

function isProduction(): boolean {
  return typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production";
}

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: TTL / 1000,
} as const;

/** Cookie options with `secure` enabled in production (HTTPS-only). */
export function getCookieOptions() {
  return { ...BASE_COOKIE_OPTIONS, secure: isProduction() };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function b64urlEncode(input: string | Uint8Array): string {
  const str = typeof input === "string" ? input : String.fromCharCode(...input);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

async function hmacKey(): Promise<string> {
  const password = await getAdminPassword();
  // Never sign with an empty key: fall back to a per-boot secret when no
  // password is configured (login is blocked anyway in that state).
  return `zyn-session:${password || getBootSecret()}`;
}

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBuf = await crypto.subtle.importKey(
    "raw",
    enc.encode(await hmacKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", keyBuf, enc.encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

async function sign(payload: string): Promise<string> {
  return `${payload}.${await hmac(payload)}`;
}

export async function createSessionToken(): Promise<string> {
  const payload = b64urlEncode(JSON.stringify({ exp: Date.now() + TTL }));
  return sign(payload);
}

export async function verifySessionToken(token: string): Promise<boolean> {
  const i = token.lastIndexOf(".");
  if (i <= 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = await hmac(payload);
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(sig);
  if (!bytesEqual(a, b)) return false;
  try {
    const data = JSON.parse(b64urlDecode(payload)) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
