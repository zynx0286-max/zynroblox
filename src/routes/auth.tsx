import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { captureError } from "@/lib/sentry";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ZYN Admin" },
      { name: "description", content: "Owner sign-in for the ZYN portfolio admin panel." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Sign in — ZYN Admin" },
      { property: "og:description", content: "Owner sign-in for the ZYN portfolio admin panel." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        await navigate({ to: "/admin" });
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (err) throw err;
        setNotice("Account created. Check your email if confirmation is required, then sign in.");
        setMode("signin");
      }
    } catch (err) {
      captureError(err, { area: "admin", action: mode });
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-2 w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="hero-glow pointer-events-none absolute inset-0 opacity-85" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),transparent_40%)]" />

      <div className="glass-card relative w-full max-w-md overflow-hidden rounded-[28px] p-6 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to site
          </Link>
          <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[0.62rem] font-display tracking-[0.18em] text-primary uppercase">
            Admin
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-background/25 p-4">
          <p className="font-display text-[0.68rem] tracking-[0.26em] text-primary uppercase">
            Portfolio control
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
            {mode === "signin" ? "Welcome back" : "Create access"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to manage works, media, reviews, and the live portfolio."
              : "Create the owner account that controls the site and its admin tools."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6">
          <label htmlFor="email" className="font-display text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label
            htmlFor="password"
            className="mt-4 block font-display text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          {notice ? <p className="mt-4 text-sm text-primary">{notice}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-display font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:scale-[1.01] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "signin" ? "First time? Create the admin account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
