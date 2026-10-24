import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowUpRight,
  Check,
  Clock,
  FileCheck,
  MessageCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { Reveal } from "@/components/Reveal";
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
        { property: "og:image", content: `${SITE_URL}/og.png` },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
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
        <PageHero
          index="02"
          label="Pricing"
          ghost="Rates"
          title={pricing.heading}
          copy={
            <>
              {pricing.sub.split("100 Robux = $1").length > 1 ? (
                <>
                  {pricing.sub.split("100 Robux = $1")[0]}
                  <strong className="font-semibold text-foreground">100 Robux = $1</strong>
                  {pricing.sub.split("100 Robux = $1").slice(1).join("100 Robux = $1")}
                </>
              ) : (
                pricing.sub
              )}
            </>
          }
          aside={<>Robux + USD gift cards · no hidden fees</>}
          meta={[
            { label: "Tiers", value: String(pricing.tiers.length).padStart(2, "0") },
            { label: "Exchange", value: "100 R$ = $1" },
            { label: "Bundles", value: "3+ sounds" },
            { label: "Payment", value: "Robux / gift card" },
          ]}
          children={
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-2 font-mono text-[0.56rem] tracking-[0.08em] text-foreground uppercase">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  {pricing.availabilityNote}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 font-mono text-[0.56rem] tracking-[0.08em] text-muted-foreground uppercase">
                  <Clock className="size-3.5 text-primary" />
                  {pricing.replyNote}
                </span>
              </div>
              <p className="flex items-start gap-2 border-l border-primary/60 pl-4 text-sm leading-relaxed text-foreground/80">
                <Zap className="mt-0.5 size-4 shrink-0 text-primary" />
                {pricing.revShareNote}
              </p>
            </div>
          }
        />

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
              <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                <span className="text-primary">Rate</span> card
              </p>
              <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground/60 uppercase">
                Quoted before work starts
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pricing.tiers.map((t, i) => {
                const featured = Boolean(t.highlight);
                return (
                  <div key={`${t.name}-${i}`} id={tierAnchor(t.name)} className="scroll-mt-28">
                    <Reveal delay={(i % 3) * 60}>
                      <article
                        className={
                          featured
                            ? "relative flex h-full flex-col overflow-hidden rounded-[26px] border border-primary bg-primary p-6 text-white transition-transform duration-300 hover:-translate-y-1 sm:p-7"
                            : "editorial-card flex h-full flex-col p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 sm:p-7"
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`font-mono text-[0.58rem] tracking-[0.16em] ${
                              featured ? "text-white/60" : "text-primary"
                            }`}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {t.tag ? (
                            <span
                              className={`rounded-full px-2.5 py-1 font-mono text-[0.5rem] tracking-[0.1em] uppercase ${
                                featured
                                  ? "bg-white/15 text-white"
                                  : "border border-border text-muted-foreground"
                              }`}
                            >
                              {t.tag}
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-8 font-display text-xl font-bold tracking-[-0.035em]">
                          {t.name}
                        </h2>
                        <p
                          className={`mt-4 font-display text-[clamp(2rem,3.2vw,2.8rem)] leading-[0.92] font-black tracking-[-0.055em] ${
                            featured ? "text-white" : "text-primary"
                          }`}
                        >
                          {t.price}
                        </p>
                        <p
                          className={`mt-1.5 text-sm font-medium ${
                            featured ? "text-white/85" : "text-foreground/80"
                          }`}
                        >
                          or {t.gift}
                        </p>
                        <p
                          className={`mt-0.5 font-mono text-[0.54rem] tracking-[0.06em] uppercase ${
                            featured ? "text-white/55" : "text-muted-foreground"
                          }`}
                        >
                          {t.unit}
                        </p>
                        <p
                          className={`mt-4 text-sm leading-relaxed ${
                            featured ? "text-white/75" : "text-muted-foreground"
                          }`}
                        >
                          {t.blurb}
                        </p>

                        <ul
                          className={`mt-5 flex-1 space-y-2.5 border-t pt-5 text-sm ${
                            featured
                              ? "border-white/20 text-white/80"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {t.points.map((p) => (
                            <li key={p} className="flex items-start gap-2">
                              <Check
                                className={`mt-0.5 size-4 shrink-0 ${
                                  featured ? "text-white" : "text-primary"
                                }`}
                              />
                              {p}
                            </li>
                          ))}
                        </ul>

                        <a
                          href={discordUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            track("cta_click", { cta: "pricing_discord", tier: t.name })
                          }
                          className={
                            featured
                              ? "mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-primary uppercase transition-transform hover:scale-[1.02]"
                              : "mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-primary-foreground uppercase transition-transform hover:scale-[1.02]"
                          }
                        >
                          <MessageCircle className="size-4" />
                          Order on Discord
                        </a>
                      </article>
                    </Reveal>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, label: "Revisions until it fits" },
                { icon: FileCheck, label: "Report or files included" },
                { icon: Clock, label: "Scoped timeline up front" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 border-t border-border py-4 text-sm text-muted-foreground"
                >
                  <item.icon className="size-4 shrink-0 text-primary" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            <div className="relative overflow-hidden rounded-[30px] border border-border bg-surface p-6 sm:p-10 lg:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(70% 120% at 90% 0%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 62%)",
                }}
              />
              <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3.5 py-1.5 font-mono text-[0.56rem] tracking-[0.1em] text-primary uppercase">
                    <Zap className="size-3.5" />
                    Bundle offer — 3+ sounds, better rate
                  </p>
                  <h2 className="mt-5 max-w-[18ch] font-display text-[clamp(2rem,4.4vw,4rem)] leading-[0.94] font-black tracking-[-0.055em]">
                    {pricing.bundleHeading}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {pricing.bundleBody}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <a
                    href={discordUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track("discord_click", { from: "pricing_footer" })}
                    className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-4 font-display text-[0.68rem] font-bold tracking-[0.11em] text-primary-foreground uppercase shadow-[var(--shadow-glow)]"
                  >
                    <MessageCircle className="size-4" />
                    Message @acczyn
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                  <p className="font-mono text-[0.52rem] tracking-[0.1em] text-muted-foreground/60 uppercase lg:text-right">
                    {pricing.replyNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PageCta
          kicker="Scope first"
          title="Don't buy a tier. Buy the outcome."
          copy="If a cheaper scope gets you the result, that's the quote. Send the game and the problem, and I'll map the shortest route."
          secondary={
            <Link
              to="/services"
              className="inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
            >
              Browse services
              <ArrowUpRight className="size-3.5 text-primary" />
            </Link>
          }
        />
      </main>
      <SiteFooter />
    </div>
  );
}
