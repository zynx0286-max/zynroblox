import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogIn, ArrowLeft, Lock, User } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { loginOwner } from "@/lib/auth.functions";
import { isAdmin } from "@/lib/works.functions";

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
  const login = useServerFn(loginOwner);
  const checkAdmin = useServerFn(isAdmin);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await login({ data: { username, password } });
      if (!res.ok) {
        setError("Invalid username or password.");
        return;
      }
      // Verify the session actually grants admin before navigating, so a
      // failed/expired session stays on /auth with a clear message instead of
      // bouncing to (or crashing on) /admin.
      try {
        const ok = await checkAdmin();
        if (ok !== true) {
          setError("Signed in, but this account doesn't have admin access.");
          return;
        }
      } catch {
        setError("Signed in, but the session couldn't be verified. Please retry.");
        return;
      }
      await navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
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
          Owner only. Signed in with the site admin password.
        </p>
      </div>
    </div>
  );
}
