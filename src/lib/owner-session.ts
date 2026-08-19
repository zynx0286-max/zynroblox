// Cookie-based owner session. Login verifies the site password on the server
// and issues a signed, httpOnly cookie; every admin server function validates
// it via `requireOwner`. Uses only Web-standard APIs so it runs in browsers,
// Node and serverless runtimes with no native dependencies.

export const COOKIE_NAME = "zyn_session";

const ADMIN_PASSWORD = (() => {
  if (typeof process !== "undefined" && process.env && process.env["ADMIN_PASSWORD"]) {
    return process.env["ADMIN_PASSWORD"];
  }
  return "Saibaba@1";
})();

const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: TTL / 1000,
} as const;

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

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBuf = await crypto.subtle.importKey(
    "raw",
    enc.encode(`zyn-session:${ADMIN_PASSWORD}`),
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
