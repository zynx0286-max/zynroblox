import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Maximize2, MessageCircle } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero, type PageHeroMeta } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { WorkMedia } from "@/components/WorkMedia";
import { WorkRail } from "@/components/WorkRail";
import { Lightbox, type LightboxItem } from "@/components/Lightbox";
import { ProjectLiveStat } from "@/components/ProjectLiveStat";
import { track } from "@/lib/analytics";
import { getPublicWorks, getPublicMedia } from "@/lib/public-data";
import { useContactSettings } from "@/components/ContactSettingsProvider";
import { resolveAsset } from "@/lib/assets";
import { isSafeMediaUrl } from "@/lib/media";
import { SITE_URL, type Work } from "@/data/works";

const GAME_URL_RE = /roblox\.com\/games\/\d+/i;

// Related projects don't get a live map here; the rail falls back to each
// project's first tag, which is honest and costs no extra API calls.
const NO_LIVE = new Map<string, { playing: number; visits: number }>();

export const Route = createFileRoute("/work/$slug")({
  loader: async ({ params }) => {
    const [works, media] = await Promise.all([getPublicWorks(), getPublicMedia()]);
    const index = works.findIndex((w) => w.slug === params.slug);
    const work = works[index];
    if (!work) throw notFound();

    return {
      work,
      works,
      index,
      prev: works.length > 1 ? (works[(index - 1 + works.length) % works.length] ?? null) : null,
      next: works.length > 1 ? (works[(index + 1) % works.length] ?? null) : null,
      media: media.filter((m) => m.workId === work.id),
    };
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
    const resolved = resolveAsset(work.image);
    const image = resolved
      ? resolved.startsWith("http") || resolved.startsWith("data:")
        ? resolved
        : `${SITE_URL}${resolved}`
      : undefined;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        // A draft is only reachable with the owner's session, but keep it out
        // of any index that might see it through a shared URL anyway.
        ...(work.status === "draft" ? [{ name: "robots", content: "noindex, nofollow" }] : []),
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
      <main className="mx-auto max-w-3xl px-4 pt-40 pb-24">
        <p className="font-mono text-[0.62rem] tracking-[0.18em] text-primary uppercase">
          404 / project
        </p>
        <h1 className="mt-5 font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.9] font-black tracking-[-0.06em]">
          Project not found.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          That project isn't in the archive. Browse everything instead — there are worse ways to
          spend five minutes.
        </p>
        <Link
          to="/work"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-primary-foreground uppercase"
        >
          <ArrowLeft className="size-4" />
          Back to the archive
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function CoverFallback({ work }: { work: Work }) {
  const initials = work.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(39,100,255,0.42),transparent_60%)]" />
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center font-display text-[clamp(7rem,20vw,16rem)] font-black tracking-[-0.08em] text-white/[0.08]">
        {initials}
      </span>
    </div>
  );
}

function WorkDetail() {
  const { work, works, media, index, prev, next } = Route.useLoaderData();
  const { discordUrl } = useContactSettings();
  const [viewer, setViewer] = useState<number | null>(null);
  const cover = resolveAsset(work.image);

  // Cover first, then every safe gallery image, all in one browsable sequence.
  const shots = useMemo<LightboxItem[]>(() => {
    const items: LightboxItem[] = [];
    if (cover) {
      items.push({ src: cover, caption: `${work.title} — cover`, alt: `${work.title} cover` });
    }
    for (const item of media) {
      if (item.mediaType !== "image" || !isSafeMediaUrl(item.url)) continue;
      items.push({
        src: item.url,
        caption: item.caption || `${work.title} — screenshot`,
        alt: item.caption || `${work.title} screenshot`,
      });
    }
    return items;
  }, [cover, media, work.title]);

  const openImage = (src: string) => {
    const at = shots.findIndex((shot) => shot.src === src);
    if (at >= 0) setViewer(at);
  };

  // Start after the current project so "more work" continues the archive
  // rather than always showing its first few entries.
  const related = useMemo(() => {
    const out: typeof works = [];
    const limit = Math.min(8, works.length - 1);
    for (let step = 1; step <= limit; step++) {
      const candidate = works[(index + step) % works.length];
      if (candidate && candidate.slug !== work.slug) out.push(candidate);
    }
    return out;
  }, [works, index, work.slug]);

  const isLiveGame = GAME_URL_RE.test(work.href ?? "");
  const staticMeta: PageHeroMeta[] = [
    { label: "Media", value: String(media.length).padStart(2, "0") },
    { label: "Tags", value: String(work.tags.length).padStart(2, "0") },
  ];
  const meta: PageHeroMeta[] = [
    { label: "Role", value: work.role },
    { label: "Category", value: work.category },
    ...(isLiveGame
      ? ([
          { label: "Players now", value: <ProjectLiveStat slug={work.slug} field="playing" /> },
          { label: "Visits", value: <ProjectLiveStat slug={work.slug} field="visits" /> },
        ] satisfies PageHeroMeta[])
      : staticMeta),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="Work / case study"
          label={work.category}
          ghost={String(index + 1).padStart(2, "0")}
          title={work.title}
          copy={<p>{work.description}</p>}
          aside={
            <Link
              to="/work"
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              All projects
            </Link>
          }
          meta={meta}
          children={
            <div className="space-y-5">
              {work.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {work.tags.slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border px-2.5 py-1 font-mono text-[0.52rem] tracking-[0.06em] text-muted-foreground uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                {work.href ? (
                  <a
                    href={work.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track("work_external_click", { slug: work.slug })}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-primary-foreground uppercase shadow-[var(--shadow-glow)]"
                  >
                    {work.linkLabel ?? "View project"}
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                ) : null}
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track("discord_click", { from: `work:${work.slug}` })}
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-foreground uppercase transition-colors hover:border-primary/50"
                >
                  <MessageCircle className="size-4 text-primary" />
                  Work with me
                </a>
              </div>
            </div>
          }
        />

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-[28px] border border-border bg-surface sm:aspect-[16/9] lg:aspect-[21/9]">
              {cover ? (
                // Game thumbnails are square, so a wide crop would cut the art.
                // Show the whole image with its own blurred, dimmed fill behind
                // it — the stage stays cinematic without losing the artwork.
                <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-[1.015]">
                  <img
                    src={cover}
                    alt=""
                    aria-hidden
                    loading="eager"
                    decoding="async"
                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
                  />
                  <div aria-hidden className="absolute inset-0 bg-background/25" />
                  <img
                    src={cover}
                    alt={`${work.title} cover`}
                    loading="eager"
                    decoding="async"
                    className="relative z-[1] h-full w-full object-contain"
                  />
                </div>
              ) : (
                <CoverFallback work={work} />
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 sm:p-7">
                <div>
                  <p className="font-mono text-[0.55rem] tracking-[0.16em] text-primary uppercase">
                    {work.category}
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold tracking-[-0.03em] sm:text-2xl">
                    {work.title}
                  </p>
                </div>
                <p className="font-mono text-[0.52rem] tracking-[0.1em] text-muted-foreground uppercase">
                  Cover / {work.role}
                </p>
              </div>

              {cover ? (
                <button
                  type="button"
                  onClick={() => setViewer(0)}
                  data-cursor-label="EXPAND"
                  aria-label="Open project cover full size"
                  className="absolute inset-0 z-10 cursor-zoom-in focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none"
                >
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-background/55 px-3 py-1.5 font-mono text-[0.52rem] tracking-[0.12em] text-foreground uppercase backdrop-blur-sm transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground sm:top-5 sm:right-5">
                    <Maximize2 className="size-3" aria-hidden />
                    Expand
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <WorkMedia media={media} onOpenImage={openImage} />

        {related.length ? (
          <section className="border-b border-border">
            <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                    <span className="text-primary">Next</span> / from the archive
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
                    More work, same standard.
                  </h2>
                </div>
                <Link
                  to="/work"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                >
                  Full archive <ArrowUpRight className="size-3.5 text-primary" />
                </Link>
              </div>
              <WorkRail works={related} liveBySlug={NO_LIVE} />
            </div>
          </section>
        ) : null}

        {prev && next ? (
          <nav aria-label="Project navigation" className="border-b border-border">
            <div className="mx-auto grid w-full max-w-[1500px] sm:grid-cols-2">
              <Link
                to="/work/$slug"
                params={{ slug: prev.slug }}
                data-cursor-label="PREV"
                className="group flex flex-col gap-3 border-b border-border px-4 py-9 transition-colors hover:bg-surface/40 sm:border-r sm:border-b-0 sm:px-6 lg:px-10 lg:py-12"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[0.56rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors group-hover:text-primary">
                  <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                  Previous project
                </span>
                <span className="max-w-[24ch] font-display text-[clamp(1.5rem,2.8vw,2.4rem)] leading-[0.98] font-black tracking-[-0.045em] transition-colors group-hover:text-primary">
                  {prev.title}
                </span>
                <span className="font-mono text-[0.54rem] tracking-[0.1em] text-muted-foreground/70 uppercase">
                  {prev.category} · {prev.role}
                </span>
              </Link>

              <Link
                to="/work/$slug"
                params={{ slug: next.slug }}
                data-cursor-label="NEXT"
                className="group flex flex-col gap-3 px-4 py-9 transition-colors hover:bg-surface/40 sm:items-end sm:px-6 sm:text-right lg:px-10 lg:py-12"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[0.56rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors group-hover:text-primary">
                  Next project
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="max-w-[24ch] font-display text-[clamp(1.5rem,2.8vw,2.4rem)] leading-[0.98] font-black tracking-[-0.045em] transition-colors group-hover:text-primary">
                  {next.title}
                </span>
                <span className="font-mono text-[0.54rem] tracking-[0.1em] text-muted-foreground/70 uppercase">
                  {next.category} · {next.role}
                </span>
              </Link>
            </div>
          </nav>
        ) : null}

        <PageCta
          kicker="Same standard, next project"
          title="Need this kind of care on your game?"
          copy="The archive is proof, not a template. Tell me what your project needs and we'll scope the smallest version that gets it there."
          secondary={
            <Link
              to="/services"
              className="inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
            >
              Explore services
              <ArrowUpRight className="size-3.5 text-primary" />
            </Link>
          }
        />
      </main>
      <SiteFooter />
      {viewer !== null ? (
        <Lightbox
          items={shots}
          index={viewer}
          onClose={() => setViewer(null)}
          onIndexChange={setViewer}
        />
      ) : null}
    </div>
  );
}

export type { Work };
