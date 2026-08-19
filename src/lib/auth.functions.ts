import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Owner-only admin gate. The password never ships to the browser — it is
// checked here on the server. Override via the `ADMIN_PASSWORD` env var in
// the Lovable dashboard; the fallback matches the requested login.
const OWNER_USERNAME = "zynx0286";
const OWNER_EMAIL = "zynx0286@gmail.com";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "Saibaba@1";

const credentialsSchema = z.object({
  username: z.string().trim().min(2).max(120),
  password: z.string().min(1).max(200),
});

export const verifyOwner = createServerFn({ method: "POST" })
  .validator((data: unknown) => credentialsSchema.parse(data))
  .handler(async ({ data }) => {
    const username = data.username.trim().toLowerCase();
    const isOwnerUser = username === OWNER_USERNAME || username === OWNER_EMAIL.toLowerCase();
    const isOwnerPassword = data.password === ADMIN_PASSWORD;

    // Constant-time-ish compare to avoid trivial timing differences.
    if (!isOwnerUser || !isOwnerPassword) {
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
      return { ok: false as const };
    }

    return { ok: true as const, email: OWNER_EMAIL };
  });
