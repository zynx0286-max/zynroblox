import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Stats } from "@/components/Stats";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { FeaturedGame } from "@/components/FeaturedGame";
import { WorkPreview } from "@/components/WorkPreview";
import { Skills } from "@/components/Skills";
import { ContactCta } from "@/components/ContactCta";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { ScrollProgress } from "@/components/ScrollProgress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZYN — Roblox SFX Artist & Sound Designer" },
      {
        name: "description",
        content:
          "Professional Roblox SFX artist creating original ability, impact, ambience and UI sound. Also offering QA testing, community management and game research.",
      },
      { property: "og:title", content: "ZYN — Roblox SFX Artist & Sound Designer" },
      {
        property: "og:description",
        content:
          "Original sound effects for Roblox games, plus QA testing, community management and game research.",
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

