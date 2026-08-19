import { SITE_URL } from "@/data/works";
import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Stats } from "@/components/Stats";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { FeaturedGame } from "@/components/FeaturedGame";
import { Testimonials } from "@/components/Testimonials";
import { WorkPreview } from "@/components/WorkPreview";
import { Skills } from "@/components/Skills";
import { ContactCta } from "@/components/ContactCta";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { ScrollProgress } from "@/components/ScrollProgress";

const TITLE = "ZYN — Roblox SFX Artist, Sound Designer & QA Tester";
const DESC =
  "Professional Roblox SFX artist creating original ability, impact, ambience and UI sound. Also offering QA testing, community management and game research.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: "ZYN",
          url: SITE_URL,
          jobTitle: "Roblox SFX Artist & Sound Designer",
          description: DESC,
          knowsAbout: [
            "Roblox sound design",
            "Game SFX",
            "QA testing",
            "Community management",
          ],
          sameAs: ["https://discord.com/users/acczyn"],
        }),
      },
    ],
  }),
  component: Index,
});


function Index() {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <SiteNav />
      <main>
        <Hero />
        <Marquee />
        <Reveal as="section">
          <Services />
        </Reveal>
        <Reveal as="section">
          <FeaturedGame />
        </Reveal>
        <Reveal as="section">
          <About />
        </Reveal>
        <Testimonials />
        <WorkPreview />
        <Reveal as="section">
          <Stats />
        </Reveal>
        <Reveal as="section">
          <Skills />
        </Reveal>
        <ContactCta />
      </main>
      <SiteFooter />
    </div>
  );
}

