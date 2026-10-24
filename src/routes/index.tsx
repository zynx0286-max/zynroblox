import { SITE_URL } from "@/data/works";
import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { About } from "@/components/About";
import { FeaturedGame } from "@/components/FeaturedGame";
import { WorkPreview } from "@/components/WorkPreview";
import { ReviewWall } from "@/components/ReviewWall";
import { Faq } from "@/components/Faq";
import { ContactCta } from "@/components/ContactCta";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { getPublicSiteData } from "@/lib/public-data";
import { getLiveGameStats } from "@/lib/live-stats.functions";

const TITLE = "ZYN — Roblox SFX Artist, Sound Designer & QA Tester";
const DESC =
  "Professional Roblox SFX artist creating original ability, impact, ambience and UI sound. Also offering QA testing, community management and game research.";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [site, liveStats] = await Promise.all([
      getPublicSiteData(),
      getLiveGameStats().catch(() => null),
    ]);
    return { ...site, liveStats };
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: Index,
});

function Index() {
  const { works, settings, reviews, liveStats } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <Hero settings={settings.hero} workCount={works.length} liveStats={liveStats} />
        <Marquee items={settings.marquee} />
        <About settings={settings.about} skills={settings.skills} />
        <Reveal as="section">
          <FeaturedGame works={works} settings={settings.featured} />
        </Reveal>
        <WorkPreview works={works} settings={settings.workPreview} liveStats={liveStats} />
        <Reveal as="section">
          <ReviewWall testimonials={settings.testimonials} reviews={reviews} preview />
        </Reveal>
        <Faq settings={settings.faq} />
        <Reveal as="section">
          <ContactCta settings={settings.contact} />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
