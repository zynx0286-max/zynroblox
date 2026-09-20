import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalBody } from "@/components/LegalBody";
import { SITE_URL } from "@/data/works";
import { getPublicSettings } from "@/lib/public-data";

const TITLE = "Terms of Service | ZYN";
const DESC = "The terms for commissioning ZYN: scope, payment, revisions, ownership, and contact.";

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
  loader: async () => ({ settings: await getPublicSettings() }),
  component: TermsPage,
});

function TermsPage() {
  const { settings } = Route.useLoaderData();
  const terms = settings.terms;
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
              Last updated: {terms.updated}. {terms.intro}
            </p>

            <div className="glass-card mt-8 space-y-6 rounded-2xl p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
              {terms.sections.map((s) => (
                <section key={s.heading}>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    {s.heading}
                  </h2>
                  <p className="mt-2">
                    <LegalBody body={s.body} />
                  </p>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
