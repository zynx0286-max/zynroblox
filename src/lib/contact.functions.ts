import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address").max(160),
  projectType: z.string().trim().min(1, "Pick a project type").max(60),
  message: z.string().trim().min(10, "Tell me a bit more (10+ characters)").max(1200),
});

/** Fields the UI adds for spam protection — never shown to real users. */
export const contactPayloadSchema = contactSchema.extend({
  /** Honeypot: must stay empty. */
  website: z.string().max(200).optional(),
  /** Milliseconds the visitor spent on the form before submitting. */
  elapsedMs: z.number().int().nonnegative().max(1000 * 60 * 60 * 12).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const OWNER_EMAIL = "zynx0286@gmail.com";
const MIN_FILL_MS = 2500;
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
  return recent.length > RATE_LIMIT;
}

function looksLikeSpam(message: string, name: string) {
  const links = (message.match(/https?:\/\//gi) ?? []).length;
  if (links > 2) return true;
  if (/\b(seo services|crypto|casino|viagra|backlinks|forex|loan offer)\b/i.test(message)) {
    return true;
  }
  if (/[\u0400-\u04FF\u4E00-\u9FFF]{12,}/.test(message)) return true;
  if (name.length > 4 && name === name.toUpperCase() && /\d{3,}/.test(name)) return true;
  return false;
}

async function sendViaResend(body: Record<string, unknown>) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Email service is not configured yet. Please reach me on Discord.");
  }

  return fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactPayloadSchema.parse(data))
  .handler(async ({ data }) => {
    // 1. Honeypot — bots fill hidden fields.
    if (data.website && data.website.trim().length > 0) {
      return { ok: true as const };
    }

    // 2. Time trap — humans take longer than a couple of seconds.
    if (typeof data.elapsedMs === "number" && data.elapsedMs < MIN_FILL_MS) {
      throw new Error("That was a little too fast — please try again.");
    }

    // 3. Per-IP rate limiting.
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    if (rateLimited(ip)) {
      throw new Error("Too many messages from this connection. Try again later or use Discord.");
    }

    // 4. Content heuristics.
    if (looksLikeSpam(data.message, data.name)) {
      throw new Error("This message was flagged as spam. Please reach me on Discord instead.");
    }

    const html = `
      <h2>New portfolio enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p><strong>Project type:</strong> ${escapeHtml(data.projectType)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(data.message).replace(/\n/g, "<br/>")}</p>
    `;

    const base = {
      from: "ZYN Portfolio <onboarding@resend.dev>",
      subject: `New enquiry — ${data.projectType} — ${data.name}`,
      reply_to: data.email,
      html,
    };

    let res = await sendViaResend({ ...base, to: [OWNER_EMAIL] });

    // Resend's shared sandbox sender can only deliver to the account owner
    // until a domain is verified. Fall back so no lead is ever dropped.
    if (res.status === 403) {
      const detail = await res.text();
      const fallback = detail.match(/\(([^)\s]+@[^)\s]+)\)/)?.[1];
      if (fallback) {
        res = await sendViaResend({
          ...base,
          to: [fallback],
          subject: `[for ${OWNER_EMAIL}] ${base.subject}`,
        });
      }
    }

    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      throw new Error("Could not send your message. Please reach me on Discord.");
    }

    return { ok: true as const };
  });
