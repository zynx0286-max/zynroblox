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
      { property: "og:type", content: "website" },
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="glass-card relative w-full max-w-sm rounded-2xl p-7">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to site
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold">
          {mode === "signin" ? "Admin sign in" : "Create admin account"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Only the portfolio owner needs this — it unlocks the works editor.
        </p>

        <form onSubmit={submit} className="mt-6">
          <label htmlFor="email" className="font-display text-xs tracking-wider text-muted-foreground uppercase">
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
            className="mt-4 block font-display text-xs tracking-wider text-muted-foreground uppercase"
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
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-display font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "First time? Create the admin account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
