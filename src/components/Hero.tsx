import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageCircle, AudioLines, Headphones } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { track } from "@/lib/analytics";
import type { HeroSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { AmbientField } from "./AmbientField";
import { MagneticButton } from "./MagneticButton";

type LayerRef = HTMLDivElement | null;

export function Hero({ settings, workCount }: { settings: HeroSettings; workCount: number }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const bgRef = useRef<LayerRef>(null);
  const glowRef = useRef<LayerRef>(null);
  const bloom1Ref = useRef<LayerRef>(null);
  const bloom2Ref = useRef<LayerRef>(null);
  const panel1Ref = useRef<LayerRef>(null);
  const panel2Ref = useRef<LayerRef>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const onMove = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      ty = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    };

    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      const apply = (el: LayerRef, x: number, y: number, r = 0) => {
        if (el) {
          el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(2)}deg)`;
        }
      };
      apply(bgRef.current, -cx * 14, -cy * 10);
      apply(glowRef.current, cx * 6, cy * 6);
      apply(bloom1Ref.current, -cx * 26, -cy * 22);
      apply(bloom2Ref.current, cx * 30, cy * 18);
      apply(panel1Ref.current, -cx * 34, -cy * 28, -8);
      apply(panel2Ref.current, cx * 38, cy * 30, 7);
      raf = requestAnimationFrame(tick);
    };

    section.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      section.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative isolate overflow-hidden pt-28 pb-16 sm:pt-44 sm:pb-32"
    >
      {/* Full-bleed blurred background */}
      <div ref={bgRef} className="pointer-events-none absolute inset-0 -z-10 will-change-transform">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          width={1920}
          height={1088}
          loading="eager"
          decoding="async"
          className="h-full w-full scale-105 object-cover opacity-70 blur-0 sm:scale-125 sm:blur-[8px] lg:blur-[10px]"
        />
        <div className="absolute inset-0 bg-background/60" />
        <div ref={glowRef} className="hero-glow absolute inset-0 will-change-transform" />
        {/* Soft floating light blooms */}
        <div
          ref={bloom1Ref}
          className="float-slow absolute -top-20 -left-24 size-[18rem] rounded-full bg-primary/20 blur-[40px] will-change-transform sm:size-[28rem] sm:blur-[120px]"
        />
        <div
          ref={bloom2Ref}
          className="float-slow absolute -right-24 top-24 size-[16rem] rounded-full bg-accent/20 blur-[45px] will-change-transform [animation-delay:-4s] sm:size-[24rem] sm:blur-[130px]"
        />
        {/* Ambient particle field (GPU-cheap canvas, skips itself on
            reduced-motion / low-power screens). */}
        <AmbientField className="opacity-70 mix-blend-screen" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background sm:h-64" />
      </div>

      {/* Floating glass panels */}
      <div
        ref={panel1Ref}
        aria-hidden
        className={cn(
          "glass-card pointer-events-none absolute top-40 -left-16 hidden h-40 w-72 rounded-3xl lg:block",
          enabled && "float-slow will-change-transform",
        )}
        style={{ transform: "rotate(-8deg)" }}
      />
      <div
        ref={panel2Ref}
        aria-hidden
        className={cn(
          "glass-card pointer-events-none absolute bottom-24 -right-14 hidden h-44 w-72 rounded-3xl lg:block",
          enabled && "float-slow will-change-transform [animation-delay:-3s]",
        )}
        style={{ transform: "rotate(7deg)" }}
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <p className="rise-in font-display text-2xl font-bold tracking-[0.35em] text-primary sm:text-4xl sm:tracking-[0.45em]">
          {settings.name}
        </p>

        <p className="glass-card mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-display text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:mt-6 sm:px-4 sm:text-[0.7rem] sm:tracking-[0.25em]">
          <AudioLines className="size-3.5 text-primary" />
          {settings.badge}
        </p>

        <h1 className="mt-5 font-display text-[2rem] leading-[1.08] font-bold sm:mt-6 sm:text-6xl sm:leading-[1.05]">
          {settings.titlePrefix}{" "}
          <span className="inline-block bg-primary px-2 text-primary-foreground">
            {settings.titleHighlight}
          </span>
          <br className="hidden sm:block" /> {settings.titleSuffix}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground sm:mt-6 sm:text-lg">
          {settings.subtext}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <MagneticButton>
            <Link
              to="/work"
              onClick={() => track("cta_click", { cta: "hear_my_work" })}
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-primary px-6 py-4 font-display text-base font-bold tracking-wide text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] sm:w-auto sm:gap-3 sm:px-10 sm:py-5 sm:text-xl"
            >
              <Headphones className="size-5 sm:size-6" />
              {settings.ctaLabel}
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 sm:size-6" />
            </Link>
          </MagneticButton>
          <a
            href={settings.discordUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("discord_click", { from: "hero" })}
            className="glass-card inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 font-display text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50 active:scale-[0.98] sm:w-auto sm:px-8 sm:py-5 sm:text-base"
          >
            <MessageCircle className="size-5 text-primary" />
            {settings.discordLabel}
          </a>
        </div>

        <p className="mt-4 text-[0.7rem] text-muted-foreground sm:text-xs">
          {workCount} {settings.ctaNote}
        </p>

        <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-2.5 sm:mt-14 sm:grid-cols-4 sm:gap-3">
          {settings.stats.map((s) => (
            <div key={s.label} className="glass-card rounded-2xl px-3 py-4 sm:px-4 sm:py-5">
              <dt className="font-display text-xl font-bold text-primary sm:text-2xl">{s.value}</dt>
              <dd className="mt-1 text-[0.62rem] tracking-[0.12em] text-muted-foreground uppercase sm:text-[0.7rem] sm:tracking-[0.15em]">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
