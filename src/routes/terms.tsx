import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { LegalArticle } from "@/components/LegalArticle";
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
        <PageHero
          index="Legal"
          label="Terms"
          ghost="Terms"
          title={
            <>
              Terms of <span className="text-primary">service.</span>
            </>
          }
          copy={
            <div className="space-y-3">
              <p className="font-mono text-[0.56rem] tracking-[0.12em] text-muted-foreground/70 uppercase">
                Last updated · {terms.updated}
              </p>
              <p>{terms.intro}</p>
            </div>
          }
          aside={
            <Link
              to="/"
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
          }
        />
        <LegalArticle sections={terms.sections} />
      </main>
      <SiteFooter />
    </div>
  );
}
