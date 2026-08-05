import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { WorkCard } from "@/components/WorkCard";
import { works } from "@/data/works";

export function WorkPreview() {
  const preview = works.filter((w) => !w.featured).slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            My Work
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Projects & Case Studies
          </h2>
          <p className="mt-3 text-muted-foreground">
            Click any card to view the project on Roblox or visit the community page.
          </p>
        </div>

        <Link
          to="/work"
          className="group glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-semibold"
        >
          View all work
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {preview.map((w) => (
          <WorkCard key={w.slug} work={w} />
        ))}
      </div>
    </section>
  );
}
