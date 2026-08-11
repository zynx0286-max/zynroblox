import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, CheckCircle2, MessageCircle, AlertCircle } from "lucide-react";
import { contactSchema, sendContactMessage } from "@/lib/contact.functions";
import { track } from "@/lib/analytics";


const projectTypes = [
  "SFX Design",
  "QA Testing",
  "Community Management",
  "Game Research",
  "Other",
];

type FieldKey = "name" | "email" | "projectType" | "message";
type Errors = Partial<Record<FieldKey, string>>;

const MESSAGE_MAX = 1200;

export function ContactForm() {
  const send = useServerFn(sendContactMessage);
  const [values, setValues] = useState({
    name: "",
    email: "",
    projectType: "SFX Design",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(Date.now());


  const validate = (next = values): Errors => {
    const parsed = contactSchema.safeParse(next);
    if (parsed.success) return {};
    const out: Errors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as FieldKey;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  };

  const setField = (key: FieldKey, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) {
      const all = validate(next);
      setErrors((prev) => ({ ...prev, [key]: all[key] }));
    }
  };

  const blur = (key: FieldKey) => {
    setTouched((t) => ({ ...t, [key]: true }));
    const all = validate();
    setErrors((prev) => ({ ...prev, [key]: all[key] }));
  };

  const fieldBase =
    "w-full rounded-xl border bg-background/40 px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40";
  const fieldCls = (key: FieldKey) =>
    `${fieldBase} ${errors[key] ? "border-destructive/70 focus:border-destructive" : "border-border focus:border-primary/60"}`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const found = validate();
    setTouched({ name: true, email: true, projectType: true, message: true });
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setErrors({});
    setStatus("sending");
    track("contact_submit", { projectType: values.projectType });
    try {
      await send({
        data: {
          ...contactSchema.parse(values),
          website: honeypot,
          elapsedMs: Date.now() - startedAt.current,
        },
      });
      setStatus("sent");
      track("contact_success", { projectType: values.projectType });
      setValues({ name: "", email: "", projectType: "SFX Design", message: "" });
      setTouched({});
      startedAt.current = Date.now();
    } catch (err) {
      setStatus("error");
      track("contact_error", {});
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Try Discord instead.",
      );
    }
  };


  const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <label
      htmlFor={htmlFor}
      className="font-display text-xs tracking-wider text-muted-foreground uppercase"
    >
      {children} <span className="text-primary">*</span>
    </label>
  );

  const ErrorText = ({ id, msg }: { id: string; msg?: string | undefined }) =>
    msg ? (
      <p id={id} className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="size-3.5" />
        {msg}
      </p>
    ) : null;

  if (status === "sent") {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto size-9 text-primary" />
        <h3 className="mt-4 font-display text-xl font-semibold">Message sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          It landed in my inbox. Email replies can take a while — ping me on Discord for a
          faster answer.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="https://discord.com/users/acczyn"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03]"
          >
            <MessageCircle className="size-4" />
            Discord — @acczyn
          </a>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="rounded-full border border-border px-5 py-3 font-display text-sm hover:bg-secondary/60"
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="glass-card rounded-2xl p-5 text-left sm:p-8"
    >
      {/* Honeypot — hidden from humans, irresistible to bots */}
      <div aria-hidden className="pointer-events-none absolute -left-[9999px] opacity-0">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="relative">
        <h3 className="font-display text-lg font-semibold">Start a project</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Takes about a minute — all fields are required. Protected against spam.
        </p>
      </div>


      <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={`mt-2 ${fieldCls("name")}`}
            placeholder="Your name"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            onBlur={() => blur("name")}
          />
          <ErrorText id="name-error" msg={errors.name} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`mt-2 ${fieldCls("email")}`}
            placeholder="you@studio.com"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => blur("email")}
          />
          <ErrorText id="email-error" msg={errors.email} />
        </div>
      </div>

      <div className="relative mt-4">
        <Label htmlFor="projectType">Project type</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {projectTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setField("projectType", t)}
              aria-pressed={values.projectType === t}
              className={`rounded-full border px-4 py-2 font-display text-xs transition-colors ${
                values.projectType === t
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">Message</Label>
          <span className="text-[0.7rem] text-muted-foreground">
            {values.message.length}/{MESSAGE_MAX}
          </span>
        </div>
        <textarea
          id="message"
          rows={5}
          maxLength={MESSAGE_MAX}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`mt-2 resize-none ${fieldCls("message")}`}
          placeholder="Tell me about your game, the sounds you need, and your timeline."
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          onBlur={() => blur("message")}
        />
        <ErrorText id="message-error" msg={errors.message} />
      </div>

      {serverError ? (
        <p className="relative mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 font-display text-base font-bold text-primary-foreground transition-all hover:shadow-[var(--shadow-glow)] disabled:opacity-60"
      >
        {status === "sending" ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        {status === "sending" ? "Sending…" : "Send message"}
      </button>

      <a
        href="https://discord.com/users/acczyn"
        target="_blank"
        rel="noreferrer"
        className="relative mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-7 py-3 font-display text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
      >
        <MessageCircle className="size-4 text-primary" />
        Or message me on Discord — @acczyn
      </a>
    </form>
  );
}
