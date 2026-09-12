import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/data/works";

const TITLE = "Security & Responsible Disclosure | ZYN";
const DESC =
  "Found a vulnerability in this portfolio? How to report it, what's in scope, and the safe-harbor promise.";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/security` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/security` }],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="relative mx-auto max-w-3xl px-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
            <p className="mt-4 inline-flex items-center gap-2 font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              <ShieldCheck className="size-4" />
              Security
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Responsible disclosure
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Found a vulnerability or a way this site could be hacked? Thank you — report it
              privately and it will be fixed as fast as possible. Please do not exploit it or
              share it publicly before a fix is out.
            </p>

            <div className="glass-card mt-8 space-y-6 rounded-2xl p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  How to report
                </h2>
                <p className="mt-2">
                  Message <span className="text-foreground">@acczyn</span> on Discord or email{" "}
                  <span className="text-foreground">zynx0286@gmail.com</span> with: what you
                  found, steps to reproduce, and the impact you think it has. Expect an
                  acknowledgement within 48 hours. Reports stay confidential.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  In scope
                </h2>
                <p className="mt-2">
                  This portfolio site itself: authentication bypass on the admin login, stored or
                  reflected XSS via the contact form, reviews or testimonials, CSRF on admin
                  actions, rate-limit bypasses, and information leaks (session tokens, secrets,
                  other users&apos; data).
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Out of scope & rules
                </h2>
                <p className="mt-2">
                  Third-party services (Roblox, Discord, Cloudflare, Resend) — report those to
                  the vendor. Do not run DoS/load tests, do not brute-force the login beyond
                  what&apos;s needed to demonstrate the issue, no social engineering or phishing
                  of any person, and never access, modify, or delete data that isn&apos;t yours.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Safe harbor & bounty
                </h2>
                <p className="mt-2">
                  Research done in good faith within these rules will not be met with legal
                  action. There is no paid bounty program — this is a personal portfolio — but
                  valid reporters get credit in the hall of fame below (with permission) and
                  eternal gratitude.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Hall of fame
                </h2>
                <p className="mt-2">
                  No reports yet — be the first. Past hardening work: login rate-limiting,
                  HMAC-signed admin sessions, geo-fenced admin access, honeypot + time-trap +
                  per-IP limits on the contact form, and strict security headers.
                </p>
              </section>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
