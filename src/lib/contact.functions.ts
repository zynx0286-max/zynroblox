import { z } from "zod";

// Validation-only now: the contact form opens Gmail with the message
// pre-filled instead of posting to a server endpoint, so the old
// send-via-Resend path (honeypot, rate limits, email dispatch) was removed.

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address").max(160),
  projectType: z.string().trim().min(1, "Pick a project type").max(60),
  message: z.string().trim().min(10, "Tell me a bit more (10+ characters)").max(1200),
});

export type ContactInput = z.infer<typeof contactSchema>;
