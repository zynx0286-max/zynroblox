import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Check } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { track } from "@/lib/analytics";
import { SITE_URL } from "@/data/works";

const TITLE = "Pricing — Roblox SFX, QA & Community Rates | ZYN";
const DESC =
  "Transparent Robux rates: SFX 250 R$ per sound, music 2500 R$, QA testing 500 R$, community management 500 R$/week, game research 2500 R$, Discord builds 3000 R$.";

const DISCORD = "https://discord.com/users/acczyn";

type Tier = {
  name: string;
  price: string;
  unit: string;
  blurb: string;
  points: string[];
  highlight?: boolean;
};

const tiers: Tier[] = [
  {
    name: "SFX Design",
    price: "250 R$",
    unit: "per sound effect",
    blurb: "Original ability, impact, UI and ambience sounds built for your game.",
    points: ["Custom-made, royalty free", "Game-ready formats", "Revisions until it fits"],
    highlight: true,
  },
  {
    name: "Music",
    price: "2500 R$",
    unit: "per track",
    blurb: "Original looping music for menus, lobbies and gameplay.",
    points: ["Loop-ready master", "Theme written to your brief", "Stems on request"],
  },
  {
    name: "QA Testing",
    price: "500 R$",
    unit: "per game",
    blurb: "Structured bug hunting with clear, reproducible reports.",
    points: ["Repro steps + severity", "Device and edge-case passes", "Written report"],
  },
  {
    name: "Community Management",
    price: "500 R$",
    unit: "per week",
    blurb: "Day-to-day running of your Discord community.",
    points: ["Moderation + escalation", "Announcements & events", "Player feedback loop"],
  },
  {
    name: "Game Research",
    price: "2500 R$",
    unit: "per report",
    blurb: "Deep market and gameplay analysis on your genre and competitors.",
    points: ["Competitor teardown", "Retention & monetization notes", "Actionable roadmap"],
  },
  {
    name: "Discord Build + Manage",
    price: "3000 R$",
    unit: "setup + management",
    blurb: "Full server build — structure, roles, bots, monetization — then run it.",
    points: ["Server architecture & roles", "Bots + automation", "Monetization setup"],
  },
  {
    name: "Discord Management",
    price: "500 R$",
    unit: "per week",
    blurb: "Ongoing management of an existing server.",
    points: ["Daily moderation", "Event scheduling", "Growth reporting"],
  },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: `${SITE_URL}/pricing` },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/pricing` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "OfferCatalog",
          name: "ZYN Roblox services",
          url: `${SITE_URL}/pricing`,
          itemListElement: tiers.map((t) => ({
            "@type": "Offer",
            name: t.name,
            description: t.blurb,
            priceCurrency: "RBX",
            price: t.price.replace(/[^0-9]/g, ""),
          })),
        }),
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              Pricing
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Simple Robux rates.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              Every rate is in Robux. Pick a service, message me on Discord and we&apos;ll lock in
              scope and timeline — bundles for multiple sounds are negotiable.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 70}>
                <div
                  className={`glass-card flex h-full flex-col rounded-2xl p-6 ${
                    t.highlight ? "border-primary/40 shadow-[var(--shadow-glow)]" : ""
                  }`}
                >
                  {t.highlight ? (
                    <span className="mb-3 self-start rounded-full bg-primary/15 px-3 py-1 font-display text-[0.6rem] tracking-[0.2em] text-primary uppercase">
                      Most requested
                    </span>
                  ) : null}
                  <h2 className="font-display text-lg font-semibold">{t.name}</h2>
                  <p className="mt-3 font-display text-3xl font-bold text-primary">{t.price}</p>
                  <p className="text-xs text-muted-foreground">{t.unit}</p>
                  <p className="mt-4 text-sm text-muted-foreground">{t.blurb}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {t.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={DISCORD}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track("cta_click", { cta: "pricing_discord", tier: t.name })}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
                  >
                    <MessageCircle className="size-4" />
                    Order on Discord
                  </a>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="glass-card mt-10 rounded-2xl p-6 text-center sm:p-8">
            <h2 className="font-display text-xl font-bold">Need a custom bundle?</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Full sound packs, long-term QA or a community + Discord retainer — send the details
              and I&apos;ll quote it. Discord gets the fastest reply.
            </p>
            <a
              href={DISCORD}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("discord_click", { from: "pricing_footer" })}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 font-display font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <MessageCircle className="size-5" />
              Message @acczyn
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
