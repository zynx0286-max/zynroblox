import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, MessageCircle } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
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
        { property: "og:image", content: `${SITE_URL}/favicon.png` },
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

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 font-display text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              All services
            </Link>
            <p className="mt-4 font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              {useCase.tagline}
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">{useCase.title}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              {useCase.need}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-foreground/85">
              {useCase.outcome}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={discordUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => track("cta_click", { cta: "service_discord", tier: useCase.title })}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 font-display text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03]"
              >
                <MessageCircle className="size-4" />
                Start on Discord
              </a>
              <Link
                to="/pricing"
                hash={useCase.pricingAnchor}
                className="glass-card inline-flex items-center gap-2 rounded-full px-7 py-4 font-display text-sm font-semibold transition-colors hover:bg-secondary/50"
              >
                See full prices
                <ArrowRight className="size-4" />
              </Link>
            </div>
            {useCase.note ? (
              <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-primary/25 bg-primary/5 px-5 py-3 text-xs leading-relaxed font-medium text-foreground/85 sm:text-sm">
                {useCase.note}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-8">
          <Reveal>
            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold">What&apos;s included</h2>
              <ul className="mt-4 space-y-3">
                {useCase.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-3 text-[15px] leading-relaxed">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="font-medium text-foreground/90">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {related.length > 0 ? (
          <section className="mx-auto max-w-6xl px-4 py-10">
            <h2 className="font-display text-2xl font-bold">Proof from the archive</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((w, i) => (
                <Reveal key={w.slug} delay={(i % 3) * 70}>
                  <WorkCard work={w} />
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-4xl px-4 py-10">
          <h2 className="font-display text-2xl font-bold">Questions, answered</h2>
          <div className="mt-6 space-y-3">
            {useCase.faqs.map((f) => (
              <div key={f.q} className="glass-card rounded-2xl p-5 sm:p-6">
                <h3 className="font-display text-base font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-20">
          <div className="glass-card rounded-2xl p-6 text-center sm:p-8">
            <h2 className="font-display text-xl font-bold">Need something else?</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  to="/services/$slug"
                  params={{ slug: o.slug }}
                  className="rounded-full border border-border px-4 py-2 font-display text-xs transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {o.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
