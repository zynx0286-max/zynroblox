import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/owner-session";

// Server-only gate for admin functions. Kept as a dedicated middleware module
// so the client build stubs it and never pulls in server-only cookie APIs.

export const requireOwner = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const token = getCookie(COOKIE_NAME) ?? null;
  if (!token || !(await verifySessionToken(token))) {
    throw new Error("Unauthorized: please sign in");
  }
  return next({ context: { owner: true } });
});
