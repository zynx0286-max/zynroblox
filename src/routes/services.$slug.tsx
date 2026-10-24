import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { Magnetic } from "@/components/Magnetic";
import { WorkCard } from "@/components/WorkCard";
import { Reveal } from "@/components/Reveal";
import { track } from "@/lib/analytics";
import { SITE_URL } from "@/data/works";
import { getUseCase, USE_CASES } from "@/data/services";
import { getPublicWorks, getPublicSettings } from "@/lib/public-data";

export const Route = createFileRoute("/services/$slug")({
  loader: async ({ params }) => {
    const useCase = getUseCase(params.slug);
    if (!useCase) throw notFound();
    const [works, settings] = await Promise.all([getPublicWorks(), getPublicSettings()]);
    const related = works
      .filter(
        (w) =>
          useCase.matchCategories.includes(w.category) ||
          w.tags.some((t) => useCase.matchTags.includes(t)),
      )
      .slice(0, 3);
    return { useCase, related, discordUrl: settings.contact.discordUrl };
  },
  head: ({ params, loaderData }) => {
    const useCase = loaderData?.useCase ?? getUseCase(params.slug);
    const url = `${SITE_URL}/services/${params.slug}`;
    if (!useCase) {
      return {
        meta: [{ title: "Service unavailable — ZYN" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${useCase.title} for Roblox Games | ZYN`;
    const description = `${useCase.tagline}. ${useCase.outcome}`.slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: `${SITE_URL}/og.png` },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: useCase.title,
            description: useCase.outcome,
            url,
            provider: { "@type": "Person", name: "ZYN", url: SITE_URL },
            areaServed: "Roblox",
          }),
        },
      ],
    };
  },
  component: ServicePage,
});

function ServicePage() {
  const { useCase, related, discordUrl } = Route.useLoaderData();
  const others = USE_CASES.filter((u) => u.slug !== useCase.slug);
  const ghost = useCase.title.split(/\s+/)[0] ?? "Scope";

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="01 / Service"
          label={useCase.tagline}
          ghost={ghost}
          title={useCase.title}
          copy={
            <>
              <p>{useCase.need}</p>
              <p className="mt-4 border-l border-primary/60 pl-4 text-foreground/90">
                {useCase.outcome}
              </p>
            </>
          }
          aside={
            <Link
              to="/services"
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              All services
            </Link>
          }
          meta={[
            { label: "Engagement", value: "Fixed scope" },
            { label: "First reply", value: "Within 48h" },
            { label: "Revisions", value: "Included" },
            { label: "Proof", value: "Files + report" },
          ]}
          children={
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Magnetic strength={7}>
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    track("cta_click", { cta: "service_discord", tier: useCase.title })
                  }
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-display text-[0.68rem] font-bold tracking-[0.12em] text-primary-foreground uppercase shadow-[var(--shadow-glow)]"
                >
                  <MessageCircle className="size-4" />
                  Start on Discord
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </Magnetic>
              <Link
                to="/pricing"
                hash={useCase.pricingAnchor}
                className="group inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.62rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
              >
                See full rates
                <ArrowRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          }
        />

        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-[1500px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-10 lg:py-24">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
                <div>
                  <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                    <span className="text-primary">Scope</span> / deliverables
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
                    What&apos;s included.
                  </h2>
                </div>
                <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground/60 uppercase">
                  {String(useCase.deliverables.length).padStart(2, "0")} items
                </p>
              </div>

              <ol className="mt-2">
                {useCase.deliverables.map((d, i) => (
                  <li key={d} className="border-b border-border">
                    <Reveal
                      delay={Math.min(i * 60, 240)}
                      className="grid grid-cols-[auto_1fr] items-start gap-5 py-6 sm:gap-8"
                    >
                      <span className="mt-1 font-mono text-[0.6rem] tracking-[0.14em] text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="max-w-2xl font-display text-lg leading-[1.25] font-semibold tracking-[-0.025em] sm:text-xl">
                        {d}
                      </p>
                    </Reveal>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>
                  Everything above is agreed before the first file is made. If the game needs less
                  than this, the scope gets smaller — not the standard.
                </p>
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="editorial-card p-6 sm:p-8">
                <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted-foreground/70 uppercase">
                  Rate &amp; terms
                </p>
                <p className="mt-4 font-display text-[clamp(1.6rem,2.6vw,2.2rem)] leading-[1.05] font-black tracking-[-0.045em]">
                  {useCase.priceNote}
                </p>

                {useCase.note ? (
                  <p className="mt-5 border-l border-primary/60 pl-4 text-sm leading-relaxed text-foreground/80">
                    {useCase.note}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5">
                  <a
                    href={discordUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      track("cta_click", { cta: "service_sidebar_discord", tier: useCase.title })
                    }
                    className="group inline-flex items-center justify-between gap-2 rounded-full bg-primary px-5 py-3.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-primary-foreground uppercase"
                  >
                    Start a scope
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                  <Link
                    to="/pricing"
                    hash={useCase.pricingAnchor}
                    className="group inline-flex items-center justify-between gap-2 rounded-full border border-border px-5 py-3.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-foreground uppercase transition-colors hover:border-primary/50"
                  >
                    Open the rate card
                    <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>

                <p className="mt-5 font-mono text-[0.52rem] tracking-[0.1em] text-muted-foreground/60 uppercase">
                  Private builds welcome · NDA-style discretion
                </p>
              </div>
            </aside>
          </div>
        </section>

        {related.length > 0 ? (
          <section className="border-b border-border">
            <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                    <span className="text-primary">Proof</span> / from the archive
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
                    Related work.
                  </h2>
                </div>
                <Link
                  to="/work"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                >
                  All projects <ArrowUpRight className="size-3.5 text-primary" />
                </Link>
              </div>

              <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((w, i) => (
                  <Reveal key={w.slug} delay={(i % 3) * 70}>
                    <WorkCard work={w} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-[1500px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-10 lg:py-24">
            <div>
              <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                <span className="text-primary">FAQ</span> / details
              </p>
              <h2 className="mt-6 max-w-[12ch] font-display text-[clamp(2rem,4.2vw,3.6rem)] leading-[0.94] font-black tracking-[-0.055em]">
                Questions, answered.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                If the answer you need lives outside these, send it over on Discord — the reply is
                usually same-day.
              </p>
            </div>

            <div className="space-y-2">
              {useCase.faqs.map((faq, i) => (
                <details
                  key={faq.q}
                  open={i === 0}
                  className="editorial-card group [&::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-display text-base font-semibold sm:px-6 sm:text-lg [&::marker]:hidden">
                    {faq.q}
                    <ChevronDown className="size-4 shrink-0 text-primary transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">
                Need a different door?
              </p>
              <div className="flex flex-wrap gap-2">
                {others.map((o) => (
                  <Link
                    key={o.slug}
                    to="/services/$slug"
                    params={{ slug: o.slug }}
                    className="rounded-full border border-border px-3.5 py-2 font-mono text-[0.58rem] tracking-[0.06em] text-muted-foreground uppercase transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {o.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <PageCta
          kicker="Paper the scope"
          title="Tell me how the game should feel."
          copy="A short message and a game link is enough to start. I'll reply with the smallest scope that gets you there."
          secondary={
            <Link
              to="/services"
              className="inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
            >
              Other services
              <ArrowUpRight className="size-3.5 text-primary" />
            </Link>
          }
        />
      </main>
      <SiteFooter />
    </div>
  );
}
