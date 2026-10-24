import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SectionHead } from "@/components/bits/SectionHead";
import { Magnetic } from "@/components/Magnetic";
import { WorkRail } from "@/components/WorkRail";
import type { Work } from "@/data/works";
import type { WorkPreviewSettings } from "@/lib/site-settings";
import type { LiveGameStats } from "@/lib/live-stats.functions";

export function WorkPreview({
  works,
  settings,
  liveStats,
}: {
  works: Work[];
  settings: WorkPreviewSettings;
  liveStats?: LiveGameStats | null;
}) {
  // The incoming order is the admin's arrangement (loader → store sortOrder).
  // No second sort heuristic here — the reorder arrows must be authoritative.
  const preview = works.filter((w) => !w.featured).slice(0, 6);
  const liveBySlug = new Map(
    (liveStats?.games ?? []).map((g) => [g.slug, { playing: g.playing, visits: g.visits }]),
  );

  return (
    <section id="work" className="border-t border-border">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-[clamp(4.5rem,8vw,8rem)] sm:px-6 lg:px-10">
        <SectionHead
          index="03"
          label="Selected projects"
          title={settings.heading}
          copy={settings.copy}
          aside={
            <span className="inline-flex items-center gap-2 font-mono text-[0.56rem] tracking-[0.14em] text-muted-foreground/70 uppercase">
              <span className="zyn-live-dot" aria-hidden />
              Drag · scroll · snap
            </span>
          }
        />

        {preview.length > 0 ? (
          <WorkRail works={preview} liveBySlug={liveBySlug} />
        ) : (
          <p className="mt-10 text-sm text-muted-foreground">
            Projects are being indexed — check back shortly.
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="font-mono text-[0.6rem] tracking-[0.14em] text-muted-foreground/70 uppercase">
            {String(preview.length).padStart(2, "0")} / {String(works.length).padStart(2, "0")}{" "}
            projects shown
          </p>
          <Magnetic strength={7}>
            <Link
              to="/work"
              className="group inline-flex items-center gap-2 border-b border-primary/50 pb-1 font-display text-[0.7rem] font-bold tracking-[0.12em] text-foreground uppercase transition-colors hover:border-primary"
            >
              {settings.ctaLabel}
              <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
