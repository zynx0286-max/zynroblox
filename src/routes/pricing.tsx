import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Check, Zap, ShieldCheck, Clock } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { SpotlightCard } from "@/components/bits/SpotlightCard";
import { track } from "@/lib/analytics";
import { SITE_URL } from "@/data/works";

const TITLE = "Pricing — Roblox SFX, QA & Community Rates | ZYN";
const DESC =
  "Robux + Visa gift card rates (100 R$ = $1): simple SFX 300-500 R$, medium 500-850 R$, hard/music 1000-5000+ R$, QA 500 R$ + 100 R$/bug, management 1k-5k+ R$/week.";

const DISCORD = "https://discord.com/users/acczyn";

type Tier = {
  name: string;
  price: string;
  gift: string;
  unit: string;
  blurb: string;
  points: string[];
  highlight?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Simple SFX",
    price: "300–500 R$",
    gift: "$3–$5 Visa gift card",
    unit: "per simple sound",
    blurb: "UI buttons, footsteps, doors and other quick one-shots.",
    points: ["Custom-made, royalty free", "Game-ready formats", "Revisions until it fits"],
    highlight: true,
  },
  {
    name: "Medium SFX",
    price: "500–850 R$",
    gift: "$5–$8.50 Visa gift card",
    unit: "per sound",
    blurb: "Weapon reloads, magic spells, small explosions, vehicle engine loops and ambience.",
    points: ["Layered, game-ready mix", "Loop-ready where needed", "Revisions until it fits"],
  },
  {
    name: "Hard SFX & Music",
    price: "1,000–5,000+ R$",
    gift: "$10–$50+ Visa gift card",
    unit: "per sound · music per 30 seconds",
    blurb: "Complex sound design and original looping music, priced per 30 seconds of track.",
    points: ["Stems on request", "Theme written to your brief", "Revisions until it fits"],
  },
  {
    name: "QA Testing",
    price: "500 R$ + 100 R$/bug",
    gift: "$5 + $1 per bug",
    unit: "per game",
    blurb: "Structured bug hunting with clear, reproducible reports.",
    points: [
      "Repro steps + severity",
      "Device and edge-case passes",
      "100 R$ ($1) per confirmed bug",
    ],
  },
  {
    name: "Community Management",
    price: "1,000–5,000+ R$",
    gift: "$10–$50+ Visa gift card",
    unit: "per week",
    blurb: "Day-to-day running of your game community.",
    points: ["Moderation + escalation", "Announcements & events", "Player feedback loop"],
  },
  {
    name: "Game Research",
    price: "2500 R$",
    gift: "$25 Visa gift card",
    unit: "per report",
    blurb: "Deep market and gameplay analysis on your genre and competitors.",
    points: ["Competitor teardown", "Retention & monetization notes", "Actionable roadmap"],
  },
  {
    name: "Discord Server Build",
    price: "3000 R$",
    gift: "$30 Visa gift card",
    unit: "full setup",
    blurb: "Full server build — structure, roles, bots, monetization.",
    points: ["Server architecture & roles", "Bots + automation setup", "Monetization setup"],
  },
  {
    name: "Bots & Automation",
    price: "5,000+ R$",
    gift: "$50+ Visa gift card",
    unit: "per setup",
    blurb: "Custom bots, automations and integrations for your server.",
    points: ["Custom commands & flows", "Moderation automation", "Testing + handover docs"],
  },
  {
    name: "Discord Management",
    price: "1,000–5,000+ R$",
    gift: "$10–$50+ Visa gift card",
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
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/pricing` },
      { property: "og:image", content: `${SITE_URL}/favicon.png` },
      { name: "twitter:card", content: "summary_large_image" },
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
            price: (t.price.match(/[\d,]+/)?.[0] ?? "").replace(/,/g, ""),
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
              Every service lists Robux <span className="text-foreground/80">and</span> Visa gift
              card pricing — <span className="font-semibold text-foreground">100 Robux = $1</span>.
              Pick a service, message me on Discord and we&apos;ll lock in scope and timeline.
            </p>
            <div className="mx-auto mt-4 flex max-w-2xl flex-col items-center justify-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-foreground">
                <Zap className="size-3.5 text-primary" />
                Game over 100 CCU? Ask about long-term rev share instead of upfront rates.
              </span>
            </div>
            <div className="mx-auto mt-6 flex max-w-xl flex-col items-center justify-center gap-2 sm:flex-row">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Available now — 2 commission slots left this week
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
                <Clock className="size-3.5 text-primary" />
                Avg. reply: 48h · Discord fastest
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 70}>
                <SpotlightCard
                  className={`glass-card h-full rounded-2xl transition-all duration-300 ${
                    t.highlight ? "border-primary/40 shadow-[var(--shadow-glow)]" : ""
                  }`}
                >
                  <div className="flex h-full flex-col p-6">
                    {t.highlight ? (
                      <span className="mb-3 self-start rounded-full bg-primary/15 px-3 py-1 font-display text-[0.6rem] tracking-[0.2em] text-primary uppercase">
                        Most requested · 2 slots left
                      </span>
                    ) : t.name === "QA Testing" ? (
                      <span className="mb-3 self-start rounded-full border border-border bg-secondary/40 px-3 py-1 font-display text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                        3 QA slots / week
                      </span>
                    ) : null}
                    <h2 className="font-display text-lg font-semibold">{t.name}</h2>
                    <p className="mt-3 font-display text-3xl font-bold text-primary">{t.price}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground/85">or {t.gift}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.unit}</p>
                    <p className="mt-4 text-sm text-muted-foreground">{t.blurb}</p>
                    <ul className="mt-4 flex-1 space-y-2">
                      {t.points.map((p) => (
                        <li
                          key={p}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
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
                </SpotlightCard>
              </Reveal>
            ))}
          </div>

          <div className="glass-card mt-10 rounded-2xl p-6 text-center sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 font-display text-[0.65rem] tracking-[0.2em] text-primary uppercase">
              <Zap className="size-3.5" />
              Bundle offer — 3+ sounds, better rate
            </p>
            <h2 className="mt-3 font-display text-xl font-bold">Need a custom bundle?</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Full sound packs, long-term QA or a community + Discord retainer — send the details
              and I&apos;ll quote it. Discord gets the fastest reply.
            </p>
            <p className="mx-auto mt-3 flex max-w-lg flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                <ShieldCheck className="size-3.5 text-primary" />
                Revisions until it fits
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                <ShieldCheck className="size-3.5 text-primary" />
                Structured QA report included
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                <Clock className="size-3.5 text-primary" />
                scoped timeline up front
              </span>
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
