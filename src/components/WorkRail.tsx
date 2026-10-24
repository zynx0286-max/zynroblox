import { useCallback, useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, MoveHorizontal } from "lucide-react";
import { resolveAsset } from "@/lib/assets";
import { track } from "@/lib/analytics";
import type { Work } from "@/data/works";
import { formatCompact } from "./WorkCard";

type Live = { playing: number; visits: number } | undefined;

function initials(title: string) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

/**
 * Horizontal project rail.
 *
 * Native horizontal scrolling (trackpad, touch, keyboard) plus a click-drag
 * mode for mouse users, snap alignment, arrows and a progress line. Cards stay
 * ordinary links: dragging past a few pixels suppresses the click so a drag
 * never opens a case study by accident.
 */
export function WorkRail({
  works,
  liveBySlug,
}: {
  works: Work[];
  liveBySlug: Map<string, { playing: number; visits: number }>;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLSpanElement | null>(null);
  const drag = useRef<{ id: number; startX: number; startLeft: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const frame = useRef(0);
  const [view, setView] = useState({ first: 0, last: 0, atStart: true, atEnd: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const progress = max > 0 ? Math.min(1, Math.max(0, track.scrollLeft / max)) : 0;
    if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;

    // Report the cards actually in view (not a fake single "active" index):
    // on desktop several fit at once, so the rail reads 01–03 / 06. A card
    // counts once at least a quarter of it is visible.
    const card = track.querySelector<HTMLElement>("[data-rail-card]");
    const step = card ? card.offsetWidth + 20 : 1;
    const lastIndex = Math.max(0, works.length - 1);
    const first = Math.min(lastIndex, Math.floor((track.scrollLeft + step * 0.2) / step));
    const last = Math.min(
      lastIndex,
      Math.max(first, Math.floor((track.scrollLeft + track.clientWidth - step * 0.25) / step)),
    );
    const atStart = track.scrollLeft <= 2;
    const atEnd = max <= 2 || track.scrollLeft >= max - 2;
    setView((prev) =>
      prev.first === first && prev.last === last && prev.atStart === atStart && prev.atEnd === atEnd
        ? prev
        : { first, last, atStart, atEnd },
    );
  }, [works.length]);

  const onScroll = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [measure, onScroll]);

  const scrollByCards = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-rail-card]");
    const step = card ? card.offsetWidth + 20 : 420;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      startLeft: track.scrollLeft,
      moved: false,
    };
    track.style.cursor = "grabbing";
    try {
      track.setPointerCapture(event.pointerId);
    } catch {
      /* capture is a nice-to-have */
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const track = trackRef.current;
    if (!d || !track || d.id !== event.pointerId) return;
    const dx = event.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      suppressClick.current = true;
    }
    if (d.moved) track.scrollLeft = d.startLeft - dx;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (drag.current?.id === event.pointerId) {
      drag.current = null;
      if (track) {
        track.style.cursor = "";
        try {
          if (track.hasPointerCapture(event.pointerId)) {
            track.releasePointerCapture(event.pointerId);
          }
        } catch {
          /* ignore */
        }
      }
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 80);
    }
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByCards(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByCards(-1);
    }
  };

  return (
    <div className="relative mt-10">
      <div
        ref={trackRef}
        role="region"
        aria-label="Selected projects, horizontally scrollable"
        tabIndex={0}
        data-cursor-label="DRAG"
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
        className="zyn-rail -mx-4 flex snap-x snap-proximity scroll-pl-4 gap-5 overflow-x-auto px-4 pb-3 select-none sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:-mx-10 lg:scroll-pl-10 lg:px-10"
      >
        {works.map((work, i) => {
          const live = liveBySlug.get(work.slug) as Live;
          const image = resolveAsset(work.image);
          return (
            <Link
              key={work.slug}
              to="/work/$slug"
              params={{ slug: work.slug }}
              data-rail-card
              data-cursor-label="VIEW"
              onClick={() => track("work_view", { slug: work.slug, category: work.category })}
              className="group relative w-[82vw] max-w-[470px] shrink-0 snap-start sm:w-[56vw] lg:w-[36vw]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[26px] border border-border bg-surface">
                {image ? (
                  <img
                    src={image}
                    alt={`${work.title} thumbnail`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
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
                    <span className="absolute inset-0 flex items-center justify-center font-display text-[clamp(5rem,10vw,8rem)] font-black tracking-[-0.08em] text-white/[0.08]">
                      {initials(work.title)}
                    </span>
                  </div>
                )}

                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent opacity-95"
                />

                <span className="absolute top-4 left-4 rounded-full border border-white/15 bg-background/55 px-2.5 py-1 font-mono text-[0.56rem] tracking-[0.14em] text-foreground/90 uppercase backdrop-blur-sm">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="absolute top-4 right-4 grid size-10 place-items-center rounded-full border border-white/20 bg-background/45 text-foreground backdrop-blur-sm transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="font-mono text-[0.56rem] tracking-[0.16em] text-primary uppercase">
                    {work.category}
                  </p>
                  <h3 className="mt-2 max-w-[18ch] font-display text-2xl leading-[0.98] font-black tracking-[-0.045em] sm:text-3xl">
                    {work.title}
                  </h3>
                  <p className="mt-2 font-mono text-[0.56rem] tracking-[0.1em] text-muted-foreground uppercase">
                    {work.role}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 font-mono text-[0.56rem] tracking-[0.08em] uppercase">
                <div className="flex items-center gap-4 text-muted-foreground">
                  {live ? (
                    <>
                      {live.playing > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="zyn-live-dot" aria-hidden />
                          <b className="font-medium text-foreground">
                            {formatCompact(live.playing)}
                          </b>{" "}
                          playing
                        </span>
                      ) : null}
                      <span>
                        <b className="font-medium text-foreground">{formatCompact(live.visits)}</b>{" "}
                        visits
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
            </Link>
          );
        })}
        <span aria-hidden className="w-1 shrink-0 sm:w-6" />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="hidden items-center gap-1.5 font-mono text-[0.54rem] tracking-[0.14em] text-muted-foreground/70 uppercase sm:inline-flex">
            <MoveHorizontal className="size-3.5 text-primary" />
            Drag to explore
          </span>
          <span
            aria-hidden
            className="relative h-px w-full max-w-[240px] overflow-hidden bg-border"
          >
            <span
              ref={barRef}
              className="absolute inset-0 origin-left scale-x-0 bg-primary will-change-transform"
            />
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="mr-1 font-mono text-[0.56rem] tracking-[0.14em] text-muted-foreground tabular-nums uppercase">
            <span className="text-foreground">{String(view.first + 1).padStart(2, "0")}</span>
            {view.last > view.first ? (
              <>
                <span aria-hidden>–</span>
                <span className="text-foreground">{String(view.last + 1).padStart(2, "0")}</span>
              </>
            ) : null}
            {" / "}
            {String(works.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Scroll projects left"
            disabled={view.atStart}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:pointer-events-none disabled:border-border/50 disabled:text-muted-foreground/30"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Scroll projects right"
            disabled={view.atEnd}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:pointer-events-none disabled:border-border/50 disabled:text-muted-foreground/30"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
