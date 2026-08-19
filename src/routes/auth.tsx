import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogIn, ArrowLeft, Lock, User } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { captureError } from "@/lib/sentry";
import { verifyOwner } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin sign in — ZYN" },
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
  const check = useServerFn(verifyOwner);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      // 1. Server-side owner gate (username + ADMIN_PASSWORD, fallback "Saibaba@1").
      const gate = await check({ data: { username, password } });
      if (!gate.ok) {
        setError("Invalid username or password.");
        return;
      }

      // 2. Sign in to Supabase. The admin panel's server functions require a
      //    real Supabase session token, so we need an owner account. If it
      //    doesn't exist yet, create it on the fly with the password just typed
      //    (the "first admin" trigger in Supabase grants it the admin role).
      let { error: signInErr } = await supabase.auth.signInWithPassword({
        email: gate.email,
        password,
      });

      if (signInErr && /invalid login credentials/i.test(signInErr.message)) {
        const { error: upErr } = await supabase.auth.signUp({ email: gate.email, password });
        if (upErr) {
          if (/already registered/i.test(upErr.message)) {
            setError(
              "This owner account already exists but the password didn't match. " +
                "Reset it in the Supabase dashboard (Authentication → Users → Reset password), " +
                "then sign in again.",
            );
          } else {
            throw upErr;
          }
          return;
        }
        // Re-sign-in after creating the account.
        ({ error: signInErr } = await supabase.auth.signInWithPassword({
          email: gate.email,
          password,
        }));
        if (!signInErr) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            setNotice(
              "Owner account created. Check zynx0286@gmail.com, click the confirmation link, " +
                "then sign in again with the same password.",
            );
            return;
          }
        }
      }
      if (signInErr) throw signInErr;

      await navigate({ to: "/admin" });
    } catch (err) {
      captureError(err, { area: "admin", action: "signin" });
      setError(err instanceof Error ? `Sign in failed: ${err.message}` : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-2 w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="glass-card relative w-full max-w-sm rounded-2xl p-7">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to site
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold">Admin sign in</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Owner-only. This unlocks the site editor — works, testimonials and content.
        </p>

        <form onSubmit={submit} className="mt-6">
          <label
            htmlFor="username"
            className="font-display text-xs tracking-wider text-muted-foreground uppercase"
          >
            Username
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              className={`${field} pl-10`}
              placeholder="zynx0286"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <label
            htmlFor="password"
            className="mt-4 block font-display text-xs tracking-wider text-muted-foreground uppercase"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className={`${field} pl-10`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          {notice ? (
            <p className="mt-4 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-display font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Owner only. Your first sign-in creates the admin account automatically.
        </p>
      </div>
    </div>
  );
}
