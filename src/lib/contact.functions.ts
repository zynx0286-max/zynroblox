import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address").max(160),
  projectType: z.string().trim().min(1, "Pick a project type").max(60),
  message: z.string().trim().min(10, "Tell me a bit more (10+ characters)").max(3000),
});

export type ContactInput = z.infer<typeof contactSchema>;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) {
      throw new Error("Email service is not configured yet.");
    }

    const html = `
      <h2>New portfolio enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p><strong>Project type:</strong> ${escapeHtml(data.projectType)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(data.message).replace(/\n/g, "<br/>")}</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ZYN Portfolio <onboarding@resend.dev>",
        to: ["zynx0286@gmail.com"],
        reply_to: data.email,
        subject: `New enquiry — ${data.projectType} — ${data.name}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend error", res.status, detail);
      throw new Error("Could not send your message. Please reach me on Discord.");
    }

    return { ok: true as const };
  });
