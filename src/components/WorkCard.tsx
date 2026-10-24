import { Link } from "@tanstack/react-router";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { resolveAsset } from "@/lib/assets";
import { track } from "@/lib/analytics";
import type { Work } from "@/data/works";

/** 1,900 -> 1.9K · 112,600,000 -> 112.6M */
export function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function WorkCard({
  work,
  index,
  live,
}: {
  work: Work;
  index?: number;
  live?: { playing: number; visits: number } | undefined;
}) {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  const onPointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / Math.max(1, rect.width);
    const py = (event.clientY - rect.top) / Math.max(1, rect.height);
    const rx = (0.5 - py) * 3.2;
    const ry = (px - 0.5) * 3.6;

    el.style.transition = "transform 90ms linear";
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;

    const glow = glowRef.current;
    if (glow) {
      glow.style.background = `radial-gradient(340px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 68%)`;
      glow.style.opacity = "0.6";
    }
  };

  const onPointerLeave = () => {
    const el = cardRef.current;
    if (el) {
      el.style.transition = "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)";
      el.style.transform = "translate3d(0, 0, 0)";
    }
    if (glowRef.current) glowRef.current.style.opacity = "0";
  };

  return (
    <Link
      ref={cardRef}
      to="/work/$slug"
      params={{ slug: work.slug }}
      onClick={() => track("work_view", { slug: work.slug, category: work.category })}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
      data-cursor-label="VIEW"
      className="group relative block will-change-transform"
    >
      <div className="relative aspect-square overflow-hidden rounded-[26px] border border-border bg-surface">
        {work.image ? (
          <img
            src={resolveAsset(work.image)}
            alt={`${work.title} thumbnail`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
          />
        ) : (
          <div aria-hidden className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_28%,rgba(39,100,255,0.36),transparent_65%)]" />
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-display text-[clamp(4rem,9vw,7rem)] font-black tracking-[-0.08em] text-white/[0.08]">
              {work.title
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w.charAt(0).toUpperCase())
                .join("")}
            </span>
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-30"
        />
        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[26px] opacity-0 mix-blend-screen transition-opacity duration-300"
        />
        {typeof index === "number" ? (
          <span className="absolute top-4 left-4 rounded-full border border-white/15 bg-background/60 px-2.5 py-1 font-mono text-[0.58rem] tracking-[0.14em] text-foreground/90 uppercase backdrop-blur-sm">
            {String(index).padStart(2, "0")}
          </span>
        ) : null}
        <span className="absolute top-4 right-4 grid size-10 place-items-center rounded-full border border-white/20 bg-background/45 text-foreground backdrop-blur-sm transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>

      <div className="mt-4">
        <p className="font-mono text-[0.58rem] tracking-[0.14em] text-primary uppercase">
          {work.category}
        </p>
        <h3 className="mt-2 font-display text-lg leading-tight font-bold tracking-[-0.03em] transition-colors group-hover:text-primary sm:text-xl">
          {work.title}
        </h3>
        <p className="mt-1 font-mono text-[0.6rem] tracking-[0.08em] text-muted-foreground uppercase">
          {work.role}
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {work.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 font-mono text-[0.58rem] tracking-[0.08em] uppercase">
          <div className="flex items-center gap-4 text-muted-foreground">
            {live ? (
              <>
                <span>
                  <b className="font-medium text-foreground">{formatCompact(live.playing)}</b>{" "}
                  playing
                </span>
                <span>
                  <b className="font-medium text-foreground">{formatCompact(live.visits)}</b> visits
                </span>
              </>
            ) : (
              <span>{work.tags[0] ?? work.category}</span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-foreground/60 transition-colors group-hover:text-foreground">
            Case study <ArrowUpRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
