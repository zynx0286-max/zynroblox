import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { WorkCard } from "@/components/WorkCard";
import { Reveal } from "@/components/Reveal";
import { listWorks } from "@/lib/works.functions";

export function WorkPreview() {
  const list = useServerFn(listWorks);
  const { data: works = [] } = useQuery({ queryKey: ["works"], queryFn: () => list() });
  
  // Sort by CCU (highest first), then filter out featured and take top 6
  const preview = works
    .filter((w) => !w.featured)
    .sort((a, b) => (b.ccu || 0) - (a.ccu || 0))
    .slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            My Work
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Projects & case studies
          </h2>
          <p className="mt-3 text-muted-foreground">
            A curated mix of SFX work, QA testing, community buildouts, and player-focused polish.
          </p>
        </div>

        <Link
          to="/work"
          className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 font-display text-base font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(99,102,241,0.32)] sm:w-auto sm:px-8"
        >
          <LayoutGrid className="size-5" />
          View all {works.length} projects
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {preview.map((w, i) => (
          <Reveal key={w.slug} delay={(i % 3) * 90}>
            <WorkCard work={w} />
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-12 flex justify-center">
        <Link
          to="/work"
          className="group glass-card inline-flex w-full max-w-xl items-center justify-center gap-3 rounded-full px-6 py-5 text-center font-display text-base font-bold tracking-wide transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 sm:px-10 sm:py-6 sm:text-xl"
        >
          Browse the full work archive
          <ArrowRight className="size-6 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  );
}
