import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { SITE_URL } from "@/data/works";

const TITLE = "Security & Responsible Disclosure | ZYN";
const DESC =
  "Found a vulnerability in this portfolio? How to report it, what's in scope, and the safe-harbor promise.";

const SECTIONS = [
  { id: "how-to-report", label: "How to report" },
  { id: "in-scope", label: "In scope" },
  { id: "out-of-scope", label: "Out of scope & rules" },
  { id: "safe-harbor", label: "Safe harbor" },
  { id: "hall-of-fame", label: "Hall of fame" },
] as const;

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

function SecuritySection({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-border pb-7 last:border-b-0 last:pb-0 [&+section]:pt-7"
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[0.56rem] tracking-[0.14em] text-primary">{index}</span>
        <h2 className="font-display text-lg font-semibold tracking-[-0.02em] sm:text-xl">
          {title}
        </h2>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="Legal"
          label="Security"
          ghost="Security"
          title={
            <>
              Responsible <span className="text-primary">disclosure.</span>
            </>
          }
          copy="Found a vulnerability or a way this site could be hacked? Thank you — report it privately and it will be fixed as fast as possible. Please do not exploit it or share it publicly before a fix is out."
          aside={
            <Link
              to="/"
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
          }
          meta={[
            { label: "Response", value: "Within 48h" },
            { label: "Reports", value: "Confidential" },
            { label: "Bounty", value: "Credit only" },
            { label: "Status", value: "No open reports" },
          ]}
        />

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:grid lg:grid-cols-[0.55fr_1fr] lg:gap-16 lg:px-10 lg:py-24">
            <aside className="hidden lg:block">
              <nav aria-label="On this page" className="sticky top-24">
                <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted-foreground/70 uppercase">
                  On this page
                </p>
                <ol className="mt-4 space-y-2.5">
                  {SECTIONS.map((section, i) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="group flex items-start gap-3 font-mono text-[0.58rem] leading-relaxed tracking-[0.04em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                      >
                        <span className="text-primary/70 transition-colors group-hover:text-primary">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <div className="editorial-card p-6 sm:p-8">
              <div className="mb-7 flex items-center gap-3 border-b border-border pb-4">
                <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <ShieldCheck className="size-4" />
                </span>
                <p className="font-mono text-[0.56rem] tracking-[0.12em] text-muted-foreground uppercase">
                  Good-faith research only
                </p>
              </div>

              <SecuritySection id="how-to-report" index="01" title="How to report">
                <p>
                  Message <span className="text-foreground">@acczyn</span> on Discord or email{" "}
                  <a
                    href="mailto:zynx0286@gmail.com"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    zynx0286@gmail.com
                  </a>{" "}
                  with: what you found, steps to reproduce, and the impact you think it has. Expect
                  an acknowledgement within 48 hours. Reports stay confidential.
                </p>
              </SecuritySection>

              <SecuritySection id="in-scope" index="02" title="In scope">
                <p>
                  This portfolio site itself: authentication bypass on the admin login, stored or
                  reflected XSS via the contact form, reviews or testimonials, CSRF on admin
                  actions, rate-limit bypasses, and information leaks (session tokens, secrets,
                  other users&apos; data).
                </p>
              </SecuritySection>

              <SecuritySection id="out-of-scope" index="03" title="Out of scope & rules">
                <p>
                  Third-party services (Roblox, Discord, Cloudflare, Resend) — report those to the
                  vendor. Do not run DoS/load tests, do not brute-force the login beyond what&apos;s
                  needed to demonstrate the issue, no social engineering or phishing of any person,
                  and never access, modify, or delete data that isn&apos;t yours.
                </p>
              </SecuritySection>

              <SecuritySection id="safe-harbor" index="04" title="Safe harbor & bounty">
                <p>
                  Research done in good faith within these rules will not be met with legal action.
                  There is no paid bounty program — this is a personal portfolio — but valid
                  reporters get credit in the hall of fame below (with permission) and eternal
                  gratitude.
                </p>
              </SecuritySection>

              <SecuritySection id="hall-of-fame" index="05" title="Hall of fame">
                <p>
                  No reports yet — be the first. Past hardening work: login rate-limiting,
                  HMAC-signed admin sessions, geo-fenced admin access, honeypot + time-trap + per-IP
                  limits on the contact form, and strict security headers.
                </p>
              </SecuritySection>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
