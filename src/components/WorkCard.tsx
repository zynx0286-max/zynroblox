import { ArrowUpRight } from "lucide-react";
import { GlassImage } from "@/components/GlassFrame";
import { Tilt3D } from "@/components/Reveal";
import type { Work } from "@/data/works";

export function WorkCard({ work }: { work: Work }) {
  const inner = (
    <>
      <GlassImage src={work.image} alt={`${work.title} screenshot`} />

      <div className="mt-4 flex-1">
        <p className="font-display text-[0.65rem] tracking-[0.25em] text-primary uppercase">
          {work.category}
        </p>
        <h3 className="mt-2 font-display text-lg font-semibold">{work.title}</h3>
        <p className="text-xs text-muted-foreground">{work.role}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {work.description}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {work.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-[0.7rem] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {work.href ? (
        <span className="mt-4 inline-flex items-center gap-1 font-display text-xs text-primary">
          {work.linkLabel ?? "View project"}
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      ) : null}
    </>
  );

  const className =
    "group glass-card relative flex h-full flex-col rounded-2xl p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]";

  return (
    <Tilt3D className="h-full" strength={6}>
      {work.href ? (
        <a href={work.href} target="_blank" rel="noreferrer" className={className}>
          {inner}
        </a>
      ) : (
        <article className={className}>{inner}</article>
      )}
    </Tilt3D>
  );
}
