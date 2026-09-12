import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/data/works";

const TITLE = "Privacy Policy | ZYN";
const DESC =
  "How ZYN handles your data: what the contact form collects, where it is stored, and your rights.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/privacy` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy` }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
            <p className="mt-4 font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              Privacy
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">Privacy policy</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Last updated: September 2026. Short version: this site collects the minimum needed to
              reply to you, and nothing else.
            </p>

            <div className="glass-card mt-8 space-y-6 rounded-2xl p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  What is collected
                </h2>
                <p className="mt-2">
                  If you use the contact form: your name, email address, project type and message.
                  That&apos;s it. On-page events (like button clicks) are only kept in memory in
                  your browser, and no third-party analytics, advertising, or cross-site trackers
                  run on this site.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Cookies & local storage
                </h2>
                <p className="mt-2">
                  No tracking or advertising cookies are set. Two functional exceptions: (1) your
                  cookie-banner choice is remembered in your browser&apos;s local storage, and (2)
                  the password-protected admin area uses a single strictly-necessary session
                  cookie (<code>zyn_session</code>) for the site owner only. Declining the banner
                  changes nothing about how the site works — there is nothing extra to opt out
                  of.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Where it goes
                </h2>
                <p className="mt-2">
                  Form messages are stored privately so ZYN can read and reply to them. They are
                  never sold, shared, or used for marketing. Outbound links (Discord, Roblox, Gmail)
                  are covered by those services&apos; own privacy policies.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Your rights
                </h2>
                <p className="mt-2">
                  Want your message viewed, corrected or deleted? Message @acczyn on Discord or
                  email zynx0286@gmail.com and it will be handled directly. Under laws like the
                  GDPR (EU/UK) and CCPA/CPRA (California) you can request access, correction,
                  deletion, and — since nothing is sold or shared — there is no sale or sharing
                  of personal information to opt out of.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Children
                </h2>
                <p className="mt-2">
                  This site is aimed at game developers, not children. The contact form is
                  intended for users aged 13 and over — if you are under 13, please have a parent
                  or guardian contact ZYN on your behalf. Messages known to be from children
                  under 13 are deleted on discovery.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Retention & changes
                </h2>
                <p className="mt-2">
                  Contact messages are kept only as long as needed to handle your enquiry, then
                  deleted on request or when no longer needed. If this policy changes materially,
                  the &quot;Last updated&quot; date above will change with it — check back
                  occasionally. Continued use of the site after a change means you accept the
                  updated policy.
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
