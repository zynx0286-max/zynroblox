import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink, Gamepad2 } from "lucide-react";
import { GlassImage } from "@/components/GlassFrame";
import { SpotlightCard } from "@/components/bits/SpotlightCard";
import { track } from "@/lib/analytics";
import { safeExternalUrl } from "@/lib/url";
import type { Work } from "@/data/works";

export function WorkCard({ work }: { work: Work }) {
  // Stored hrefs are validated at save time; re-checking here means even a
  // hand-edited legacy row can never become a javascript: link.
  const externalHref = safeExternalUrl(work.href);
  return (
    <SpotlightCard className="glass-card h-full rounded-2xl transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
      <Link
        to="/work/$slug"
        params={{ slug: work.slug }}
        onClick={() => track("work_view", { slug: work.slug, category: work.category })}
        className="group relative flex h-full flex-col rounded-2xl p-3 active:scale-[0.99] sm:p-4"
      >
        <GlassImage src={work.image} alt={`${work.title} thumbnail`} />

        <div className="mt-4 flex-1">
          <p className="font-display text-[0.65rem] tracking-[0.25em] text-primary uppercase">
            {work.category}
          </p>
          <h3 className="mt-2 font-display text-base font-semibold sm:text-lg">{work.title}</h3>
          <p className="text-xs text-muted-foreground">{work.role}</p>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {work.description}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {work.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[0.6rem] text-muted-foreground sm:px-3 sm:text-[0.65rem]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {externalHref ? (
            // NOTE: not an <a> — the whole card is already a <Link> (an
            // anchor); nesting anchors is invalid HTML and breaks hydration.
            // The real external link lives on the work detail page.
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-display text-xs text-primary">
              {externalHref.includes("/games/") ? (
                <Gamepad2 className="size-3.5" />
              ) : (
                <ExternalLink className="size-3.5" />
              )}
              {work.linkLabel ?? "Open"}
              <ArrowUpRight className="size-3.5" />
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 font-display text-xs text-muted-foreground">
            Details
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </SpotlightCard>
  );
}
