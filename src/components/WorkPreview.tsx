import { Link } from "@tanstack/react-router";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { WorkCard } from "@/components/WorkCard";
import type { Work } from "@/data/works";
import { Reveal } from "@/components/Reveal";
import type { WorkPreviewSettings } from "@/lib/site-settings";

export function WorkPreview({ works, settings }: { works: Work[]; settings: WorkPreviewSettings }) {
  const preview = works.filter((w) => !w.featured).slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            My Work
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{settings.heading}</h2>
          <p className="mt-3 text-muted-foreground">{settings.copy}</p>
        </div>

        <Link
          to="/work"
          className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 font-display text-base font-bold sm:w-auto sm:px-8 text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 hover:scale-[1.03]"
        >
          <LayoutGrid className="size-5" />
          {settings.ctaLabel} {works.length} projects
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
          className="group glass-card inline-flex w-full max-w-xl items-center justify-center gap-3 rounded-full px-6 py-5 text-center font-display text-base font-bold tracking-wide transition-transform duration-300 hover:scale-[1.02] sm:px-10 sm:py-6 sm:text-xl"
        >
          Browse the full work archive
          <ArrowRight className="size-6 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  );
}
