import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Bug,
  Users,
  Rocket,
  Search,
  Server,
  Bot,
  MessageSquare,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { Reveal } from "@/components/Reveal";
import { SpotlightCard } from "@/components/bits/SpotlightCard";
import { SITE_URL } from "@/data/works";
import { USE_CASES } from "@/data/services";
import { getPublicSettings } from "@/lib/public-data";
import { ICONS as SITE_ICONS } from "@/lib/site-settings";

const TITLE = "Services for Roblox Developers — SFX, QA, Community & Pre-Release | ZYN";
const DESC =
  "Hire by need: original SFX and sound design, structured QA testing, Discord community management, and pre-release verification for Roblox games.";

const ICONS = [AudioLines, Bug, Users, Rocket, Search, Server, Bot, MessageSquare] as const;

export const Route = createFileRoute("/services/")({
  loader: async () => ({ process: (await getPublicSettings()).process }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/services` },
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/services` }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { process } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="01"
          label="Services"
          ghost="Services"
          title={
            <>
              Hire by <span className="text-primary">need,</span>
              <br />
              not by job title.
            </>
          }
          copy="One Roblox-native partner for sound, QA and community. Pick the outcome you need, then get a scoped plan with a fixed rate — no retainer-shaped surprises."
          aside={<>Fixed scopes · Robux + gift cards</>}
          meta={[
            { label: "Practices", value: "08" },
            { label: "First reply", value: "Within 48h" },
            { label: "Pricing", value: "Fixed scope" },
            { label: "Rev share", value: "100+ CCU" },
          ]}
          children={
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#scope"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-[0.68rem] font-bold tracking-[0.12em] text-primary-foreground uppercase"
              >
                Browse the scope
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.62rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
              >
                See rates
                <ArrowUpRight className="size-3.5 text-primary" />
              </Link>
            </div>
          }
        />

        <section id="scope" className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
              <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                <span className="text-primary">Scope</span> index
              </p>
              <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground/60 uppercase">
                {String(USE_CASES.length).padStart(2, "0")} ways in
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {USE_CASES.map((u, i) => {
                const Icon = ICONS[i % ICONS.length]!;
                return (
                  <Reveal key={u.slug} delay={(i % 2) * 70}>
                    <Link
                      to="/services/$slug"
                      params={{ slug: u.slug }}
                      data-cursor-label="VIEW"
                      className="group block h-full"
                    >
                      <SpotlightCard
                        spotlightColor="rgba(39, 100, 255, 0.18)"
                        className="editorial-card h-full p-6 transition-colors duration-300 group-hover:border-primary/50 sm:p-8"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span className="font-mono text-[0.62rem] tracking-[0.16em] text-primary">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <Icon className="size-5 text-muted-foreground/50 transition-colors duration-300 group-hover:text-primary" />
                        </div>

                        <h2 className="mt-10 max-w-[18ch] font-display text-2xl leading-[1.02] font-bold tracking-[-0.045em] sm:text-3xl">
                          {u.title}
                        </h2>
                        <p className="mt-2 font-mono text-[0.58rem] tracking-[0.12em] text-primary uppercase">
                          {u.tagline}
                        </p>
                        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                          {u.need}
                        </p>

                        <div className="mt-8 flex items-end justify-between gap-4 border-t border-border pt-4">
                          <span className="line-clamp-1 font-mono text-[0.54rem] tracking-[0.06em] text-muted-foreground/60 uppercase">
                            {u.priceNote.split("·")[0]}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-foreground uppercase transition-colors group-hover:text-primary">
                            See scope
                            <ArrowUpRight className="size-3.5 text-primary transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </div>
                      </SpotlightCard>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                  <span className="text-primary">Process</span>
                  <span aria-hidden className="h-px w-6 bg-primary/60" />
                  No guesswork
                </p>
                <h2 className="mt-6 max-w-[12ch] font-display text-[clamp(2rem,4.2vw,3.6rem)] leading-[0.94] font-black tracking-[-0.055em]">
                  {process.heading}
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {process.sub}
                </p>
              </div>

              <ol className="grid gap-3 sm:grid-cols-2">
                {process.steps.map((step, i) => {
                  const Icon = SITE_ICONS[step.icon] ?? SITE_ICONS.star;
                  const title = step.title.replace(/^\s*\d+\s*[·.-]\s*/, "");
                  return (
                    <Reveal
                      as="li"
                      key={step.title}
                      delay={i * 70}
                      className="editorial-card flex h-full flex-col p-5 sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-mono text-[0.58rem] tracking-[0.16em] text-primary">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <Icon className="size-5 text-muted-foreground/50" />
                      </div>
                      <h3 className="mt-7 font-display text-lg leading-tight font-bold">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.copy}
                      </p>
                    </Reveal>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        <PageCta
          kicker="Not sure which one?"
          title="Send the game and the problem."
          copy="Describe what feels flat, broken or quiet. I'll point you at the smallest scope that fixes it — even if that means telling you not to hire me yet."
          secondary={
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
            >
              Compare rates
              <ArrowUpRight className="size-3.5 text-primary" />
            </Link>
          }
        />
      </main>
      <SiteFooter />
    </div>
  );
}
