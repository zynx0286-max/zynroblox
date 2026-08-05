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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZYN — Roblox QA Tester & Community Specialist" },
      {
        name: "description",
        content:
          "Freelance Roblox QA testing, community management, game analysis and SFX design. Cleaner updates, stronger communities, happier players.",
      },
      { property: "og:title", content: "ZYN — Roblox QA Tester & Community Specialist" },
      {
        property: "og:description",
        content:
          "Freelance Roblox QA testing, community management, game analysis and SFX design.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <Hero />
        <Marquee />
        <Stats />
        <About />
        <Services />
        <FeaturedGame />
        <WorkPreview />
        <Skills />
        <ContactCta />
      </main>
      <SiteFooter />
    </div>
  );
}
