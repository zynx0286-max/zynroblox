import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { WorkCard } from "@/components/WorkCard";
import { Reveal } from "@/components/Reveal";
import { CATEGORIES, SITE_URL } from "@/data/works";
import { getPublicWorks } from "@/lib/public-data";
import { getLiveGameStats } from "@/lib/live-stats.functions";

const PAGE_TITLE = "Roblox Work Archive — QA Testing, SFX & Community | ZYN";
const PAGE_DESC =
  "Browse every Roblox project ZYN has worked on: SFX design, QA testing, game scouting and community management. Search by title, role or tag.";

export type WorkSearch = { q?: string; cat?: string };

export const Route = createFileRoute("/work/")({
  // Admin-arranged order (store sortOrder) is authoritative here — the
  // archive mirrors exactly what the owner ordered in the admin panel.
  loader: async () => {
    const [works, liveStats] = await Promise.all([
      getPublicWorks(),
      getLiveGameStats().catch(() => null),
    ]);
    return { works, liveStats };
  },
  validateSearch: (search: Record<string, unknown>): WorkSearch => {
    const out: WorkSearch = {};
    if (typeof search["q"] === "string" && search["q"]) out.q = search["q"];
    if (typeof search["cat"] === "string" && search["cat"] && search["cat"] !== "All Work")
      out.cat = search["cat"];
    return out;
  },
  head: ({ loaderData }) => {
    const works = loaderData?.works ?? [];
    return {
      meta: [
        { title: PAGE_TITLE },
        { name: "description", content: PAGE_DESC },
        { property: "og:title", content: PAGE_TITLE },
        { property: "og:description", content: PAGE_DESC },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE_URL}/work` },
        { property: "og:image", content: `${SITE_URL}/og.png` },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/work` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: PAGE_TITLE,
            description: PAGE_DESC,
            url: `${SITE_URL}/work`,
            hasPart: works.map((w) => ({
              "@type": "CreativeWork",
              name: w.title,
              url: `${SITE_URL}/work/${w.slug}`,
            })),
          }),
        },
      ],
    };
  },
  component: WorkPage,
});

function WorkPage() {
  const { works, liveStats } = Route.useLoaderData();
  const search = Route.useSearch();
  const q = search.q ?? "";
  const cat = search.cat ?? "All Work";
  const navigate = useNavigate({ from: "/work/" });

  const setSearch = (next: WorkSearch) => {
    const merged: WorkSearch = { q, cat, ...next };
    const clean: WorkSearch = {};
    if (merged.q) clean.q = merged.q;
    if (merged.cat && merged.cat !== "All Work") clean.cat = merged.cat;
    // Filters update in place: a page-level View Transition on every
    // keystroke would flash the whole archive.
    void navigate({ search: clean, replace: true, viewTransition: false });
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>([["All Work", works.length]]);
    for (const w of works) map.set(w.category, (map.get(w.category) ?? 0) + 1);
    return map;
  }, [works]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // Loader order (CCU first) is preserved — filter only.
    return works.filter((w) => {
      const matchesCategory = cat === "All Work" || w.category === cat;
      const matchesQuery =
        needle.length === 0 ||
        w.title.toLowerCase().includes(needle) ||
        w.role.toLowerCase().includes(needle) ||
        w.category.toLowerCase().includes(needle) ||
        w.description.toLowerCase().includes(needle) ||
        w.tags.some((t) => t.toLowerCase().includes(needle));
      return matchesCategory && matchesQuery;
    });
  }, [q, cat, works]);

  const liveBySlug = useMemo(
    () => new Map((liveStats?.games ?? []).map((g) => [g.slug, g])),
    [liveStats],
  );
  const livePlaying = liveStats?.totalPlaying ?? 0;
  const categories = new Set(works.map((w) => w.category));
  const filters: string[] = ["All Work", ...CATEGORIES];
  const activeFilter = cat !== "All Work" || q.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="04"
          label="Work archive"
          ghost="Archive"
          title={
            <>
              Games I&apos;ve <span className="text-primary">helped shape.</span>
            </>
          }
          copy={`Search ${works.length} projects by title, role, tag or category — sound design, QA testing, game scouting and community work. Live player counts travel with each project.`}
          aside={<>Ordered by the archive, not an algorithm</>}
          meta={[
            { label: "Projects", value: String(works.length).padStart(2, "0") },
            { label: "Categories", value: String(categories.size).padStart(2, "0") },
            { label: "Playing now", value: livePlaying.toLocaleString() },
            { label: "Search", value: "Title · role · tag" },
          ]}
        />

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                  <span className="text-primary">Archive</span> / filter
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
                  Every project, one place.
                </h2>
              </div>
              <p className="font-mono text-[0.56rem] tracking-[0.12em] text-muted-foreground/60 uppercase">
                {String(works.length).padStart(2, "0")} indexed
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex w-full max-w-xl items-center gap-3 rounded-full border border-border bg-surface px-5 py-3.5 transition-colors focus-within:border-primary/60">
                <Search className="size-4 shrink-0 text-primary" />
                <span className="sr-only">Search work</span>
                <input
                  value={q}
                  onChange={(e) => setSearch({ q: e.target.value })}
                  placeholder="Search by title, role or tag"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {q ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch({ q: "" })}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </label>

              <p className="font-mono text-[0.58rem] tracking-[0.12em] text-muted-foreground uppercase">
                Showing {filtered.length} of {works.length}
                {cat !== "All Work" ? ` · ${cat}` : ""}
              </p>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSearch({ cat: f })}
                  aria-pressed={cat === f}
                  className={`shrink-0 rounded-full border px-3.5 py-2 font-mono text-[0.58rem] tracking-[0.06em] whitespace-nowrap uppercase transition-colors ${
                    cat === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {f}
                  <span className="ml-1.5 opacity-60">{counts.get(f) ?? 0}</span>
                </button>
              ))}
              {activeFilter ? (
                <button
                  type="button"
                  onClick={() => setSearch({ q: "", cat: "All Work" })}
                  className="shrink-0 rounded-full px-3.5 py-2 font-mono text-[0.58rem] tracking-[0.06em] text-primary uppercase transition-colors hover:text-foreground"
                >
                  Reset
                </button>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <div className="editorial-card mx-auto mt-10 max-w-md p-8 text-center">
                <p className="font-mono text-[0.6rem] tracking-[0.16em] text-primary uppercase">
                  00 results
                </p>
                <p className="mt-3 font-display text-xl font-bold">
                  No projects match that search.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a broader term, or reset the filters to see the full archive.
                </p>
                <button
                  type="button"
                  onClick={() => setSearch({ q: "", cat: "All Work" })}
                  className="mt-6 rounded-full bg-primary px-6 py-3 font-display text-[0.66rem] font-bold tracking-[0.1em] text-primary-foreground uppercase"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((work, i) => (
                  <Reveal key={work.slug} delay={(i % 3) * 60}>
                    <WorkCard
                      work={work}
                      live={
                        liveBySlug.get(work.slug)
                          ? {
                              playing: liveBySlug.get(work.slug)!.playing,
                              visits: liveBySlug.get(work.slug)!.visits,
                            }
                          : undefined
                      }
                    />
                  </Reveal>
                ))}
              </div>
            )}

            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <p className="font-mono text-[0.58rem] tracking-[0.12em] text-muted-foreground/60 uppercase">
                {String(filtered.length).padStart(2, "0")} / {String(works.length).padStart(2, "0")}{" "}
                projects shown
              </p>
              <p className="flex items-center gap-2 font-mono text-[0.54rem] tracking-[0.1em] text-muted-foreground/60 uppercase">
                <span className="zyn-live-dot" aria-hidden />
                Live counts from Roblox
              </p>
            </div>
          </div>
        </section>

        <PageCta
          kicker="Your project next"
          title="Want your game in this archive?"
          copy="The archive is a record of work, not a waiting list. Send the game and the outcome you need — I'll tell you honestly if it's a fit."
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
    </div>
  );
}
