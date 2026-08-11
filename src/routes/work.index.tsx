import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { WorkCard } from "@/components/WorkCard";
import { CATEGORIES, works, type WorkCategory } from "@/data/works";

export const Route = createFileRoute("/work/")({
  head: () => ({
    meta: [
      { title: "Game Archive — ZYN Roblox QA & Community Work" },
      {
        name: "description",
        content:
          "Every Roblox project ZYN has worked on: QA testing, game scouting, community management, and SFX design. Search and filter the full archive.",
      },
      { property: "og:title", content: "Game Archive — ZYN Roblox QA & Community Work" },
      {
        property: "og:description",
        content:
          "Search the archive of Roblox QA testing, community management, and SFX projects ZYN has helped shape.",
      },
    ],
  }),
  component: WorkPage,
});

function WorkPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WorkCategory | "All Work">("All Work");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return works.filter((w) => {
      const matchesCategory = category === "All Work" || w.category === category;
      const matchesQuery =
        q.length === 0 ||
        w.title.toLowerCase().includes(q) ||
        w.role.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const filters: (WorkCategory | "All Work")[] = ["All Work", ...CATEGORIES];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main>
        <section className="relative overflow-hidden pt-36 pb-10 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              Game Archive
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">
              Games I've helped shape.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
              Search the archive by title to explore QA, community, and
              game-analysis work without digging through an endless wall of cards.
            </p>

            <div className="glass mx-auto mt-8 flex max-w-md items-center gap-3 rounded-full px-5 py-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, role or tag"
                aria-label="Search work"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCategory(f)}
                  className={`rounded-full px-4 py-2 font-display text-xs tracking-wide transition-colors ${
                    category === f
                      ? "bg-primary text-primary-foreground"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              No projects match that search.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((work) => (
                <WorkCard key={work.slug} work={work} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
