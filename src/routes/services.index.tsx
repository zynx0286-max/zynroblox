import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
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
import { Reveal } from "@/components/Reveal";
import { SpotlightCard } from "@/components/bits/SpotlightCard";
import { SITE_URL } from "@/data/works";
import { USE_CASES } from "@/data/services";

const TITLE = "Services for Roblox Developers — SFX, QA, Community & Pre-Release | ZYN";
const DESC =
  "Hire by need: original SFX and sound design, structured QA testing, Discord community management, and pre-release verification for Roblox games.";

const ICONS = [AudioLines, Bug, Users, Rocket, Search, Server, Bot, MessageSquare] as const;

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/services` },
      { property: "og:image", content: `${SITE_URL}/favicon.png` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/services` }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              Services
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Hire by need, not by job title.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              One Roblox-native partner for sound, QA and community — pick the outcome you need and
              get a scoped plan with a fixed Robux rate.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-5 sm:grid-cols-2">
            {USE_CASES.map((u, i) => {
              const Icon = ICONS[i % ICONS.length]!;
              return (
                <Reveal key={u.slug} delay={(i % 2) * 80}>
                  <SpotlightCard className="glass-card h-full rounded-2xl transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
                    <div className="group flex h-full flex-col p-6 sm:p-8">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <h2 className="mt-4 font-display text-xl font-bold">{u.title}</h2>
                      <p className="mt-1 font-display text-xs tracking-[0.2em] text-primary uppercase">
                        {u.tagline}
                      </p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {u.need}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <Link
                          to="/services/$slug"
                          params={{ slug: u.slug }}
                          className="inline-flex items-center gap-2 font-display text-sm font-semibold text-primary"
                        >
                          See what&apos;s included
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link
                          to="/pricing"
                          hash={u.pricingAnchor}
                          className="inline-flex items-center gap-2 font-display text-sm font-semibold text-foreground/70 transition-colors hover:text-primary"
                        >
                          See full prices
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </div>
                  </SpotlightCard>
                </Reveal>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
