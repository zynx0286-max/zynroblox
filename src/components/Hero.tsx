import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";
import type { HeroSettings } from "@/lib/site-settings";
import { AnimatedCounter } from "./AnimatedCounter";
import { HeroDoodles } from "./HeroDoodles";
import { LiveStats } from "./LiveStats";
import { Magnetic } from "./Magnetic";
import { TextType } from "./bits/TextType";

// The WebGL scene is client-only and split out of the main bundle; the CSS
// glow behind it is the fallback while the chunk loads or if WebGL is absent.
const HeroSceneLazy = lazy(() => import("./HeroScene").then((m) => ({ default: m.HeroScene })));

export function Hero({
  settings,
  workCount,
  liveStats,
}: {
  settings: HeroSettings;
  workCount: number;
  liveStats?: import("@/lib/live-stats.functions").LiveGameStats | null;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const spotRef = useRef<HTMLDivElement | null>(null);

  // A soft blue spotlight that follows the pointer across the hero. CSS-only
  // after the two custom properties are written, so it never re-renders.
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const spot = spotRef.current;
    if (!spot) return;
    const rect = event.currentTarget.getBoundingClientRect();
    spot.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    spot.style.setProperty("--my", `${event.clientY - rect.top}px`);
    spot.style.opacity = "1";
  };

  const onPointerLeave = () => {
    if (spotRef.current) spotRef.current.style.opacity = "0";
  };

  // Scroll choreography: publish a single 0→1 custom property and let CSS
  // drift the copy up and the 3D scene down. rAF-throttled, transform-only,
  // and skipped entirely under prefers-reduced-motion.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let last = -1;

    const update = () => {
      frame = 0;
      const span = Math.max(1, el.offsetHeight * 0.9);
      const p = Math.min(1, Math.max(0, window.scrollY / span));
      if (Math.abs(p - last) < 0.002) return;
      last = p;
      el.style.setProperty("--zyn-hero-p", p.toFixed(3));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative isolate overflow-hidden border-b border-border pt-[70px]"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="hero-glow pointer-events-none absolute inset-0 -z-10" />
      <div
        ref={spotRef}
        aria-hidden
        className="zyn-page-glow pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background" />
      <HeroDoodles />

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <div className="grid items-center gap-10 pt-12 pb-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-6 lg:pt-16 lg:pb-12">
          <div className="zyn-hero-copy relative z-10">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.6rem] tracking-[0.15em] text-muted-foreground uppercase sm:text-[0.66rem]">
              <span className="zyn-live-dot" aria-hidden />
              <span className="text-foreground/90">
                {settings.availability?.open ? settings.availability.label : settings.badge}
              </span>
              <span className="text-border">/</span>
              <span>{settings.badge}</span>
              <span className="zyn-wave ml-0.5" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </span>
            </p>

            <h1 className="mt-6 font-display text-[clamp(2.45rem,5.4vw,4.85rem)] leading-[0.93] font-black tracking-[-0.06em]">
              <span className="block">{settings.titlePrefix}</span>
              <span className="block text-primary" aria-hidden>
                <TextType
                  text={
                    settings.roles?.length
                      ? settings.roles.map((role) => `${role}.`)
                      : ["SFX Artist.", "QA Tester."]
                  }
                  typingSpeed={70}
                  deletingSpeed={30}
                  pauseDuration={2600}
                  showCursor={false}
                />
              </span>
              <span className="sr-only">{settings.roles?.join(", ")}</span>
              <span className="mt-4 block font-mono text-[0.6rem] font-normal tracking-[0.18em] text-muted-foreground uppercase sm:mt-5 sm:text-[0.68rem]">
                {settings.titleSuffix}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {settings.subtext}
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Magnetic>
                <Link
                  to="/work"
                  onClick={() => track("cta_click", { cta: "see_my_works" })}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-primary px-6 py-3.5 font-display text-[0.7rem] font-bold tracking-[0.12em] text-primary-foreground uppercase shadow-[var(--shadow-glow)] transition-all duration-300 hover:bg-primary/90 sm:px-7"
                >
                  {settings.ctaLabel}
                  <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Magnetic>

              <a
                href={settings.discordUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => track("discord_click", { from: "hero" })}
                className="group inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.64rem] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground sm:text-[0.68rem]"
              >
                {settings.discordLabel}
                <ArrowRight className="size-3.5 text-primary transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
            </div>

            <nav
              aria-label="Explore"
              className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.6rem] tracking-[0.12em] text-muted-foreground/80 uppercase sm:text-[0.64rem]"
            >
              {[
                { to: "/services", label: "Services" },
                { to: "/pricing", label: "Pricing" },
                { to: "/reviews", label: "Reviews" },
              ].map((l, i) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="group inline-flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <span className="text-primary/70">0{i + 1}</span>
                  {l.label}
                </Link>
              ))}
            </nav>

            <p className="mt-6 max-w-lg text-[0.7rem] leading-relaxed text-muted-foreground/80 sm:text-xs">
              <span className="font-semibold text-foreground">
                <AnimatedCounter value={workCount} duration={1500} ssrStart />
              </span>{" "}
              {settings.ctaNote}
            </p>
          </div>

          <div className="zyn-hero-media relative h-[300px] w-full sm:h-[380px] lg:h-[560px]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 55% 48%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 62%)",
                filter: "blur(24px)",
              }}
            />
            <Suspense fallback={null}>
              <HeroSceneLazy />
            </Suspense>
            <div className="zyn-hero-hint pointer-events-none absolute bottom-1 left-0 hidden items-center gap-3 font-mono text-[0.52rem] tracking-[0.2em] text-muted-foreground/60 uppercase sm:flex">
              <span className="zyn-scroll-cue" aria-hidden />
              Scroll
            </div>
            <div className="pointer-events-none absolute right-0 bottom-1 hidden items-center gap-2 font-mono text-[0.56rem] tracking-[0.16em] text-muted-foreground/60 uppercase sm:flex">
              <span className="zyn-live-dot" aria-hidden />
              WebGL scene
            </div>
          </div>
        </div>

        <LiveStats initial={liveStats ?? null} projects={workCount} />
      </div>
    </section>
  );
}
