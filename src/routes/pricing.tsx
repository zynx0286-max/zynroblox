import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageCircle, Check, Zap, ShieldCheck, Clock } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { SpotlightCard } from "@/components/bits/SpotlightCard";
import { track } from "@/lib/analytics";
import { SITE_URL } from "@/data/works";
import { getPublicSettings } from "@/lib/public-data";
import type { PricingSettings } from "@/lib/site-settings";

const TITLE = "Pricing — Roblox SFX, QA & Community Rates | ZYN";
const DESC =
  "Robux + Visa gift card rates (100 R$ = $1): simple SFX 300-500 R$, medium 500-850 R$, hard/music 1000-5000+ R$, QA 500 R$ + 100 R$/bug, management 1k-5k+ R$/week.";

/** Anchor id for a tier, e.g. "QA Testing" -> "qa-testing". Must match UseCase.pricingAnchor. */
export const tierAnchor = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const Route = createFileRoute("/pricing")({
  loader: async () => {
    const settings = await getPublicSettings();
    return { pricing: settings.pricing, discordUrl: settings.contact.discordUrl };
  },
  head: ({ loaderData }) => {
    const pricing: PricingSettings =
      loaderData?.pricing ?? ({ tiers: [] } as unknown as PricingSettings);
    return {
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
            itemListElement: pricing.tiers.map((t) => ({
              "@type": "Offer",
              name: t.name,
              description: t.blurb,
              priceCurrency: "RBX",
              price: (t.price.match(/[\d,]+/)?.[0] ?? "").replace(/,/g, ""),
            })),
          }),
        },
      ],
    };
  },
  component: PricingPage,
});

function PricingPage() {
  const { pricing, discordUrl } = Route.useLoaderData();

  // Deep-link support: /pricing#qa-testing scrolls to that tier.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, []);

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
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">{pricing.heading}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              {pricing.sub.split("100 Robux = $1").length > 1 ? (
                <>
                  {pricing.sub.split("100 Robux = $1")[0]}
                  <span className="font-semibold text-foreground">100 Robux = $1</span>
                  {pricing.sub.split("100 Robux = $1").slice(1).join("100 Robux = $1")}
                </>
              ) : (
                pricing.sub
              )}
            </p>
            <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center justify-center gap-2">
              <span className="inline-flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-6 py-4 text-center font-display text-base font-bold text-foreground sm:text-xl">
                <Zap className="size-6 shrink-0 text-primary sm:size-7" />
                {pricing.revShareNote}
              </span>
            </div>
            <div className="mx-auto mt-6 flex max-w-xl flex-col items-center justify-center gap-2 sm:flex-row">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {pricing.availabilityNote}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
                <Clock className="size-3.5 text-primary" />
                {pricing.replyNote}
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pricing.tiers.map((t, i) => (
              <div key={`${t.name}-${i}`} id={tierAnchor(t.name)} className="scroll-mt-28">
                <Reveal delay={(i % 3) * 70}>
                  <SpotlightCard
                    className={`glass-card h-full rounded-2xl transition-all duration-300 ${
                      t.highlight ? "border-primary/40 shadow-[var(--shadow-glow)]" : ""
                    }`}
                  >
                    <div className="flex h-full flex-col p-6">
                      {t.highlight ? (
                        <span className="mb-3 self-start rounded-full bg-primary/15 px-3 py-1 font-display text-[0.6rem] tracking-[0.2em] text-primary uppercase">
                          {t.tag || "Most requested"}
                        </span>
                      ) : t.tag ? (
                        <span className="mb-3 self-start rounded-full border border-border bg-secondary/40 px-3 py-1 font-display text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                          {t.tag}
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
                        href={discordUrl}
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
              </div>
            ))}
          </div>

          <div className="glass-card mt-10 rounded-2xl p-6 text-center sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 font-display text-[0.65rem] tracking-[0.2em] text-primary uppercase">
              <Zap className="size-3.5" />
              Bundle offer — 3+ sounds, better rate
            </p>
            <h2 className="mt-3 font-display text-xl font-bold">{pricing.bundleHeading}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              {pricing.bundleBody}
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
              href={discordUrl}
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
