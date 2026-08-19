import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, CheckCircle2, MessageCircle, AlertCircle } from "lucide-react";
import {
  contactSchema,
  generateContactCaptcha,
  sendContactMessage,
} from "@/lib/contact.functions";
import { track } from "@/lib/analytics";
import { captureError } from "@/lib/sentry";


const projectTypes = [
  "SFX Design",
  "QA Testing",
  "Community Management",
  "Game Research",
  "Other",
];

type FieldKey = "name" | "email" | "projectType" | "message";
type Errors = Partial<Record<FieldKey, string>>;

type ShapeType = "circle" | "square" | "triangle" | "diamond" | "hex" | "ring" | "pill" | "star";

type ChallengeTile = {
  id: number;
  shape: ShapeType;
};

type CaptchaState = {
  id: string;
  tiles: ChallengeTile[];
};

const MESSAGE_MAX = 1200;

function ShapeSvg({ shape, active }: { shape: ShapeType; active?: boolean }) {
  const fill = active ? "#f59e0b" : "#7c3aed";
  const stroke = active ? "#fbbf24" : "#a78bfa";

  switch (shape) {
    case "circle":
      return <circle cx="50" cy="50" r="24" fill={fill} />;
    case "square":
      return <rect x="26" y="26" width="48" height="48" rx="10" fill={fill} />;
    case "triangle":
      return <polygon points="50,16 84,84 16,84" fill={fill} />;
    case "diamond":
      return <polygon points="50,14 86,50 50,86 14,50" fill={fill} />;
    case "hex":
      return <polygon points="50,12 82,30 82,70 50,88 18,70 18,30" fill={fill} />;
    case "ring":
      return <circle cx="50" cy="50" r="24" fill="transparent" stroke={stroke} strokeWidth="10" />;
    case "pill":
      return <rect x="20" y="28" width="60" height="44" rx="22" fill={fill} />;
    case "star":
      return (
        <polygon
          points="50,12 60,38 88,38 65,56 74,84 50,65 26,84 35,56 12,38 40,38"
          fill={fill}
        />
      );
    default:
      return <circle cx="50" cy="50" r="24" fill={fill} />;
  }
}

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
  const [captcha, setCaptcha] = useState<CaptchaState | null>(null);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const generateCaptcha = useServerFn(generateContactCaptcha);

  const refreshCaptcha = async () => {
    setSelectedIndex(null);
    setCaptchaError(null);
    const next = await generateCaptcha();
    setCaptcha(next);
  };

  const openCaptcha = async () => {
    setCaptchaError(null);
    if (!captcha) {
      await refreshCaptcha();
    }
    setCaptchaOpen(true);
  };

  useEffect(() => {
    void generateCaptcha().then((next) => setCaptcha(next));
  }, [generateCaptcha]);


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
    if (!captcha || selectedIndex === null) {
      setCaptchaError("Please complete the security check.");
      setCaptchaOpen(true);
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
          captcha: {
            challengeId: captcha.id,
            selectedIndex,
          },
        },
      });
      setStatus("sent");
      track("contact_success", { projectType: values.projectType });
      setValues({ name: "", email: "", projectType: "SFX Design", message: "" });
      setTouched({});
      startedAt.current = Date.now();
    } catch (err) {
      captureError(err, { area: "contact", projectType: values.projectType });
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
    <>
      {captchaOpen && captcha ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/15 bg-[#0b1020]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.55)] ring-1 ring-primary/25 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-[0.7rem] tracking-[0.28em] text-primary uppercase">
                  Human verification required
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold text-foreground">
                  Pick the odd shape out
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCaptchaOpen(false)}
                className="rounded-full border border-border bg-secondary/40 px-2.5 py-1.5 text-[0.7rem] text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              This is a bot-resistance check. The correct tile is the only one that does not match the rest.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-3.5">
              {captcha.tiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  aria-label={`Select tile ${tile.id + 1}`}
                  onClick={() => {
                    setCaptchaError(null);
                    setSelectedIndex(tile.id);
                    setCaptchaOpen(false);
                  }}
                  className={`flex aspect-square items-center justify-center rounded-2xl border bg-secondary/30 transition-all duration-150 hover:scale-[1.02] hover:border-primary/60 ${
                    selectedIndex === tile.id
                      ? "border-primary/80 ring-2 ring-primary/50 shadow-[0_0_0_4px_rgba(96,165,250,0.12)]"
                      : "border-border"
                  }`}
                >
                  <svg viewBox="0 0 100 100" className="size-14 sm:size-16" aria-hidden="true">
                    <ShapeSvg shape={tile.shape} active={selectedIndex === tile.id} />
                  </svg>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Pick one tile and continue.
              </p>
              <button
                type="button"
                onClick={() => void refreshCaptcha()}
                className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-[0.7rem] font-display text-muted-foreground hover:text-foreground"
              >
                Refresh challenge
              </button>
            </div>

            {captchaError ? <p className="mt-4 text-xs text-destructive">{captchaError}</p> : null}
          </div>
        </div>
      ) : null}

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


      {!captchaOpen && captcha ? (
        <button
          type="button"
          onClick={() => void openCaptcha()}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-display text-primary shadow-[0_0_0_1px_rgba(96,165,250,0.12)] transition-all hover:bg-primary/10"
        >
          <span className="inline-flex size-2 rounded-full bg-primary shadow-[0_0_18px_rgba(59,130,246,0.8)]" />
          Complete security check before sending
        </button>
      ) : null}

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
            onFocus={() => {
              if (!captcha) void openCaptcha();
            }}
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
        onClick={() => {
          if (!captcha) {
            void openCaptcha();
          }
        }}
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
    </>
  );
}
