import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { WorkCard } from "@/components/WorkCard";
import { Reveal } from "@/components/Reveal";
import { CATEGORIES, works, SITE_URL } from "@/data/works";

const PAGE_TITLE = "Roblox Work Archive — QA Testing, SFX & Community | ZYN";
const PAGE_DESC =
  "Browse every Roblox project ZYN has worked on: SFX design, QA testing, game scouting and community management. Search by title, role or tag.";

export const Route = createFileRoute("/work/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
    cat: typeof search["cat"] === "string" ? search["cat"] : "All Work",
  }),
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/work` },
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
  }),
  component: WorkPage,
});

function WorkPage() {
  const { q, cat } = Route.useSearch();
  const navigate = useNavigate({ from: "/work" });

  const setSearch = (next: { q?: string; cat?: string }) => {
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>([["All Work", works.length]]);
    for (const w of works) map.set(w.category, (map.get(w.category) ?? 0) + 1);
    return map;
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
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
  }, [q, cat]);

  const filters: string[] = ["All Work", ...CATEGORIES];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44 sm:pb-10">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              Work Archive
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Games I&apos;ve helped shape.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Search {works.length} projects by title, role, tag or category — sound design, QA
              testing, game scouting and community work.
            </p>

            <div className="glass-card mx-auto mt-8 flex max-w-md items-center gap-3 rounded-full px-5 py-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setSearch({ q: e.target.value })}
                placeholder="Search by title, role or tag"
                aria-label="Search work"
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
            </div>

            <div className="mt-6 -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSearch({ cat: f })}
                  className={`shrink-0 snap-start rounded-full px-4 py-2 font-display text-xs tracking-wide whitespace-nowrap transition-colors ${
                    cat === f
                      ? "bg-primary text-primary-foreground"
                      : "glass-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                  <span className="ml-1.5 opacity-60">{counts.get(f) ?? 0}</span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Showing {filtered.length} of {works.length} projects
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          {filtered.length === 0 ? (
            <div className="glass-card mx-auto max-w-md rounded-2xl px-6 py-12 text-center">
              <p className="text-muted-foreground">No projects match that search.</p>
              <button
                type="button"
                onClick={() => setSearch({ q: "", cat: "All Work" })}
                className="mt-5 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {filtered.map((work, i) => (
                <Reveal key={work.slug} delay={(i % 3) * 70}>
                  <WorkCard work={work} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
