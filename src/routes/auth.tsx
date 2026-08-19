import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogIn, ArrowLeft, Lock, User, ShieldPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { captureError } from "@/lib/sentry";
import { verifyOwner } from "@/lib/auth.functions";
import { adminCount } from "@/lib/site.functions";

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

const OWNER_EMAIL = "zynx0286@gmail.com";

function AuthPage() {
  const navigate = useNavigate();
  const check = useServerFn(verifyOwner);
  const count = useServerFn(adminCount);
  const adminsQuery = useQuery({
    queryKey: ["admin-count"],
    queryFn: async () => {
      try {
        return await count();
      } catch {
        return 0;
      }
    },
    retry: 2,
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  const needsSetup = adminsQuery.data === 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const gate = await check({ data: { username, password } });
      if (!gate.ok) {
        setError("Invalid username or password.");
        return;
      }
      const { error: err } = await supabase.auth.signInWithPassword({
        email: gate.email,
        password,
      });
      if (err) throw err;
      await navigate({ to: "/admin" });
    } catch (err) {
      captureError(err, { area: "admin", action: "signin" });
      setError(
        err instanceof Error
          ? "Sign in failed. Make sure the account password matches this site's admin password."
          : "Sign in failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const createOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSetupMessage(null);
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email: OWNER_EMAIL,
        password: setupPassword,
      });
      if (err) throw err;
      setSetupMessage(
        "Owner account created. Check zynx0286@gmail.com for a confirmation link, then sign in above.",
      );
    } catch (err) {
      captureError(err, { area: "admin", action: "setup" });
      setError(err instanceof Error ? err.message : "Could not create the owner account");
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
          {setupMessage ? (
            <p className="mt-4 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs">
              {setupMessage}
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

        {needsSetup ? (
          <form onSubmit={createOwner} className="mt-6 border-t border-border pt-5">
            <p className="flex items-center gap-2 font-display text-xs tracking-wider text-primary uppercase">
              <ShieldPlus className="size-3.5" />
              First-time setup
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              No owner account exists yet. Create one for {OWNER_EMAIL} to unlock the admin panel
              (only shown while no admin exists).
            </p>
            <input
              type="email"
              value={OWNER_EMAIL}
              readOnly
              className={`${field} mt-3 opacity-70`}
            />
            <label
              htmlFor="setup-password"
              className="mt-3 block font-display text-xs tracking-wider text-muted-foreground uppercase"
            >
              Choose a password
            </label>
            <input
              id="setup-password"
              type="password"
              required
              minLength={8}
              className={field}
              placeholder="8+ characters"
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/60 px-6 py-3 font-display font-bold text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldPlus className="size-4" />
              )}
              Create owner account
            </button>
          </form>
        ) : null}

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Account creation is disabled — this panel is for the owner only.
        </p>
      </div>
    </div>
  );
}
