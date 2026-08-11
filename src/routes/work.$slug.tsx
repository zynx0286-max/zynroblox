import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, MessageCircle } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GlassImage } from "@/components/GlassFrame";
import { WorkCard } from "@/components/WorkCard";
import { Reveal } from "@/components/Reveal";
import { track } from "@/lib/analytics";
import { getWork, works, SITE_URL } from "@/data/works";

export const Route = createFileRoute("/work/$slug")({
  loader: ({ params }) => {
    const work = getWork(params.slug);
    if (!work) throw notFound();
    return { work };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/work/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Project unavailable — ZYN" }, { name: "robots", content: "noindex" }],
      };
    }
    const { work } = loaderData;
    const title = `${work.title} — ${work.role} | ZYN Roblox Portfolio`;
    const description = `${work.role} on ${work.title}. ${work.description}`.slice(0, 155);
    const image = work.image ? `${SITE_URL}${work.image}` : undefined;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: work.title,
            description: work.description,
            url,
            ...(image ? { image } : {}),
            genre: work.category,
            keywords: work.tags.join(", "),
            creator: { "@type": "Person", name: "ZYN", url: SITE_URL },
          }),
        },
      ],
    };
  },
  component: WorkDetail,
  notFoundComponent: WorkNotFound,
});

function WorkNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pt-40 pb-24 text-center">
        <h1 className="font-display text-3xl font-bold">Project not found</h1>
        <p className="mt-3 text-muted-foreground">
          That project isn&apos;t in the archive. Browse everything instead.
        </p>
        <Link
          to="/work"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 font-display font-bold text-primary-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to the archive
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function WorkDetail() {
  const { work } = Route.useLoaderData();
  const related = works
    .filter((w) => w.slug !== work.slug && w.category === work.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-5xl px-4">
            <Link
              to="/work"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              All projects
            </Link>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
                  {work.category}
                </p>
                <h1 className="mt-3 font-display text-3xl leading-tight font-bold sm:text-5xl">
                  {work.title}
                </h1>
                <p className="mt-3 font-display text-sm text-muted-foreground">{work.role}</p>
                <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
                  {work.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {work.tags.map((tag) => (
                    <span
                      key={tag}
                      className="glass-card rounded-full px-3 py-1.5 text-[0.7rem] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {work.href ? (
                    <a
                      href={work.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("work_external_click", { slug: work.slug })}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 font-display text-base font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03] sm:w-auto"
                    >
                      {work.linkLabel ?? "View project"}
                      <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  ) : null}
                  <a
                    href="https://discord.com/users/acczyn"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track("discord_click", { from: `work:${work.slug}` })}
                    className="glass-card inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 font-display text-sm font-semibold transition-colors hover:bg-secondary/50 sm:w-auto"
                  >
                    <MessageCircle className="size-5 text-primary" />
                    Work with me
                  </a>
                </div>
              </div>

              <GlassImage
                src={work.image}
                alt={`${work.title} thumbnail`}
                ratio="aspect-square"
                className="mx-auto w-full max-w-sm"
              />
            </div>
          </div>
        </section>

        {related.length ? (
          <section className="mx-auto max-w-6xl px-4 py-16">
            <Reveal>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">
                More {work.category.toLowerCase()} work
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((w, i) => (
                <Reveal key={w.slug} delay={(i % 3) * 90}>
                  <WorkCard work={w} />
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
