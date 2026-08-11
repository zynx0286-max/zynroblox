import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { GlassImage } from "@/components/GlassFrame";
import { Tilt3D } from "@/components/Reveal";
import { track } from "@/lib/analytics";
import type { Work } from "@/data/works";

export function WorkCard({ work }: { work: Work }) {
  return (
    <Tilt3D className="h-full" strength={6}>
      <Link
        to="/work/$slug"
        params={{ slug: work.slug }}
        onClick={() => track("work_view", { slug: work.slug, category: work.category })}
        className="group glass-card relative flex h-full flex-col rounded-2xl p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)] active:scale-[0.99] sm:p-4"
      >
        <GlassImage src={work.image} alt={`${work.title} thumbnail`} />

        <div className="mt-4 flex-1">
          <p className="font-display text-[0.65rem] tracking-[0.25em] text-primary uppercase">
            {work.category}
          </p>
          <h3 className="mt-2 font-display text-base font-semibold sm:text-lg">{work.title}</h3>
          <p className="text-xs text-muted-foreground">{work.role}</p>
          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
            {work.description}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {work.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[0.68rem] text-muted-foreground sm:px-3 sm:text-[0.7rem]"
            >
              {tag}
            </span>
          ))}
        </div>

        <span className="mt-4 inline-flex items-center gap-1 font-display text-xs text-primary">
          View details
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </Link>
    </Tilt3D>
  );
}
