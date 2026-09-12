import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/data/works";

const TITLE = "Terms of Service | ZYN";
const DESC =
  "The terms for commissioning ZYN: scope, payment, revisions, ownership, and contact.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/terms` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/terms` }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
            <p className="mt-4 font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              Terms
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">Terms of service</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Last updated: September 2026. Plain-language terms for working with ZYN — if
              anything here is unclear, ask on Discord before commissioning.
            </p>

            <div className="glass-card mt-8 space-y-6 rounded-2xl p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  1. Scope & quotes
                </h2>
                <p className="mt-2">
                  Every commission starts with a written brief: what is delivered, the timeline,
                  and the price. Work begins once both sides confirm the brief. Anything outside
                  the brief is quoted separately.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  2. Payment
                </h2>
                <p className="mt-2">
                  Payment in Robux or Visa gift cards (100 Robux = $1) unless otherwise agreed.
                  Larger projects may be split into milestones. Delivery happens after final
                  payment clears, unless a milestone plan says otherwise.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  3. Revisions
                </h2>
                <p className="mt-2">
                  Reasonable revisions are included until the work fits the agreed brief. New
                  directions outside the brief count as new work and are quoted separately.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  4. Ownership & credit
                </h2>
                <p className="mt-2">
                  Full rights transfer to you on final payment. ZYN may show delivered work in
                  this portfolio unless you request otherwise in writing before delivery.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  5. QA & community work
                </h2>
                <p className="mt-2">
                  QA reports describe issues found with reproduction steps — they do not guarantee
                  a bug-free game. Community and moderation advice is best-effort guidance, not
                  legal advice.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  6. Liability
                </h2>
                <p className="mt-2">
                  To the maximum extent permitted by law, liability is limited to the amount paid
                  for the commission in question. Nothing here limits rights you hold under
                  applicable consumer-protection law.
                </p>
              </section>
              <section>
                <h2 className="font-display text-base font-semibold text-foreground">
                  7. Contact
                </h2>
                <p className="mt-2">
                  Questions about these terms: message @acczyn on Discord or email
                  zynx0286@gmail.com. Continued use of this site after an update means you accept
                  the updated terms.
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
