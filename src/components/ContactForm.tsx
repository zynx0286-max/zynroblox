import { useState } from "react";
import { MessageCircle, Mail, ExternalLink } from "lucide-react";
import { contactSchema } from "@/lib/contact.functions";
import { track } from "@/lib/analytics";
import { useContactSettings } from "./ContactSettingsProvider";

const projectTypes = ["SFX Design", "QA Testing", "Community Management", "Game Research", "Other"];

type FieldKey = "name" | "email" | "projectType" | "message";
type Errors = Partial<Record<FieldKey, string>>;

const MESSAGE_MAX = 1200;

const buildGmailUrl = (
  values: {
    projectType: string;
    message: string;
    name: string;
    email: string;
  },
  contactEmail: string,
) => {
  const subject = encodeURIComponent(`Portfolio Contact: ${values.projectType} - ${values.name}`);
  const body = encodeURIComponent(
    `Name: ${values.name}\nEmail: ${values.email}\nProject Type: ${values.projectType}\n\nMessage:\n${values.message}`,
  );
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactEmail)}&su=${subject}&body=${body}`;
};

export function ContactForm() {
  const { discordUrl, email } = useContactSettings();
  const [values, setValues] = useState({
    name: "",
    email: "",
    projectType: "SFX Design",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

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

  const openGmail = () => {
    const found = validate();
    setTouched({ name: true, email: true, projectType: true, message: true });
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setErrors({});
    window.open(buildGmailUrl(values, email), "_blank", "noopener,noreferrer");
    track("contact_gmail_opened", { projectType: values.projectType });
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
        {msg}
      </p>
    ) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        openGmail();
      }}
      noValidate
      className="glass-card relative rounded-2xl p-5 text-left sm:p-8"
    >
      <div className="relative">
        <h3 className="font-display text-lg font-semibold">Start a project</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Fill this in, then send it via Gmail or Discord — your message arrives pre-written.
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
            placeholder="Your email address"
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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 font-display text-base font-bold text-primary-foreground transition-all hover:shadow-[var(--shadow-glow)]"
        >
          <Mail className="size-5" />
          Open in Gmail
        </button>

        <a
          href={discordUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("discord_click", { from: "contact" })}
          className="glass-card inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 font-display text-base font-semibold text-foreground transition-colors hover:bg-secondary/50"
        >
          <MessageCircle className="size-5 text-primary" />
          Message me on Discord
        </a>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Direct email:</span>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
        >
          {email}
          <ExternalLink className="size-3" />
        </a>
      </div>
    </form>
  );
}
