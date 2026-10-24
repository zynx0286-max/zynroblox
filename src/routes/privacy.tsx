import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { LegalArticle } from "@/components/LegalArticle";
import { SITE_URL } from "@/data/works";
import { getPublicSettings } from "@/lib/public-data";

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
  loader: async () => ({ settings: await getPublicSettings() }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { settings } = Route.useLoaderData();
  const privacy = settings.privacy;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="Legal"
          label="Privacy"
          ghost="Legal"
          title={
            <>
              Privacy <span className="text-primary">policy.</span>
            </>
          }
          copy={
            <div className="space-y-3">
              <p className="font-mono text-[0.56rem] tracking-[0.12em] text-muted-foreground/70 uppercase">
                Last updated · {privacy.updated}
              </p>
              <p>{privacy.intro}</p>
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
        <LegalArticle sections={privacy.sections} />
      </main>
      <SiteFooter />
    </div>
  );
}
