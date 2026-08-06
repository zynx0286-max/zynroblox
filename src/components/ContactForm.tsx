import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { contactSchema, sendContactMessage } from "@/lib/contact.functions";

const projectTypes = [
  "SFX Design",
  "QA Testing",
  "Community Management",
  "Game Research",
  "Other",
];

type Errors = Partial<Record<"name" | "email" | "projectType" | "message", string>>;

export function ContactForm() {
  const send = useServerFn(sendContactMessage);
  const [values, setValues] = useState({
    name: "",
    email: "",
    projectType: "SFX Design",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const field =
    "w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      await send({ data: parsed.data });
      setStatus("sent");
      setValues({ name: "", email: "", projectType: "SFX Design", message: "" });
    } catch (err) {
      setStatus("error");
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Try Discord instead.",
      );
    }
  };

  if (status === "sent") {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto size-8 text-primary" />
        <h3 className="mt-4 font-display text-xl font-semibold">Message sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          It landed in my inbox. Email replies can take a while — ping me on Discord
          <span className="text-foreground"> @acczyn</span> for a faster answer.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-full border border-border px-5 py-2 font-display text-sm hover:bg-secondary/60"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="glass rounded-2xl p-6 text-left sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="font-display text-xs tracking-wider text-muted-foreground uppercase">
            Name
          </label>
          <input
            id="name"
            className={`mt-2 ${field}`}
            placeholder="Your name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
          {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
        </div>
        <div>
          <label htmlFor="email" className="font-display text-xs tracking-wider text-muted-foreground uppercase">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={`mt-2 ${field}`}
            placeholder="you@studio.com"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
          {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email}</p> : null}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="projectType" className="font-display text-xs tracking-wider text-muted-foreground uppercase">
          Project type
        </label>
        <select
          id="projectType"
          className={`mt-2 ${field}`}
          value={values.projectType}
          onChange={(e) => setValues({ ...values, projectType: e.target.value })}
        >
          {projectTypes.map((t) => (
            <option key={t} value={t} className="bg-background">
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="message" className="font-display text-xs tracking-wider text-muted-foreground uppercase">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          className={`mt-2 resize-none ${field}`}
          placeholder="Tell me about your game, the sounds you need, and your timeline."
          value={values.message}
          onChange={(e) => setValues({ ...values, message: e.target.value })}
        />
        {errors.message ? <p className="mt-1 text-xs text-destructive">{errors.message}</p> : null}
      </div>

      {serverError ? <p className="mt-4 text-sm text-destructive">{serverError}</p> : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 font-display text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[var(--shadow-glow)] disabled:opacity-60"
      >
        {status === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
