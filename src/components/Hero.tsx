import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Play } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { track } from "@/lib/analytics";
import type { HeroSettings } from "@/lib/site-settings";
import { AnimatedCounter } from "./AnimatedCounter";
import { LiveStats } from "./LiveStats";
import { TextType } from "./bits/TextType";

export function Hero({
  settings,
  workCount,
  liveStats,
}: {
  settings: HeroSettings;
  workCount: number;
  liveStats?: import("@/lib/live-stats.functions").LiveGameStats | null;
}) {
  return (
    <section id="home" className="relative isolate overflow-hidden pt-28 pb-16 sm:pt-44 sm:pb-32">
      {/* Lightweight background: single image + flat overlay. Heavy blur
          blooms and floating glass panels were removed for low-end GPUs. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          width={1920}
          height={1088}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-background/40" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background sm:h-64" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <p className="rise-in font-display text-2xl font-bold tracking-[0.35em] text-primary sm:text-4xl sm:tracking-[0.45em]">
          {settings.name}
        </p>

        {settings.availability?.open ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[0.62rem] tracking-[0.18em] text-primary uppercase sm:mt-5 sm:text-[0.7rem] sm:tracking-[0.22em]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {settings.availability.label}
          </p>
        ) : null}

        <p className="glass-card mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-display text-[0.6rem] tracking-[0.18em] uppercase sm:mt-6 sm:px-4 sm:text-[0.7rem] sm:tracking-[0.25em]">
          {settings.badge}
        </p>

        {/* Fixed two-line headline: the rotating role always gets its own
            line, so the longest role ("Sound Designer") can never push the
            suffix onto a third line. The highlight hugs the text exactly —
            no reserved width, no trailing gap. */}
        <h1 className="mt-5 font-display text-[2rem] leading-[1.15] font-bold sm:mt-6 sm:text-6xl sm:leading-[1.1]">
          <span className="block">
            {settings.titlePrefix}{" "}
            <TextType
              text={settings.roles?.length ? settings.roles : ["SFX Artist", "QA Tester"]}
              className="inline-block bg-primary px-2 whitespace-nowrap text-primary-foreground"
              typingSpeed={70}
              deletingSpeed={32}
              pauseDuration={2400}
            />
          </span>
          <span className="block">{settings.titleSuffix}</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground sm:mt-6 sm:text-lg">
          {settings.subtext}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Link
            to="/work"
            onClick={() => track("cta_click", { cta: "see_my_works" })}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-primary px-6 py-4 font-display text-base font-bold tracking-wide text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] sm:w-auto sm:gap-3 sm:px-10 sm:py-5 sm:text-xl"
          >
            <Play className="size-5 fill-current sm:size-6" />
            {settings.ctaLabel}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 sm:size-6" />
          </Link>
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

        {/* Quick links to the standalone pages — visible without scrolling. */}
        <nav
          aria-label="Explore"
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm"
        >
          {[
            { to: "/services", label: "Services" },
            { to: "/pricing", label: "Pricing" },
            { to: "/reviews", label: "Reviews" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full border border-border bg-secondary/30 px-4 py-2 font-display transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="mt-4 text-[0.7rem] text-muted-foreground sm:text-xs">
          <AnimatedCounter value={workCount} duration={1500} ssrStart className="font-semibold" />{" "}
          {settings.ctaNote}
        </p>

        <p className="mx-auto mt-4 max-w-2xl rounded-full border border-primary/25 bg-primary/5 px-5 py-2.5 text-xs font-medium text-foreground/85 sm:text-sm">
          One Roblox-native partner for <span className="font-semibold text-primary">sound</span>,{" "}
          <span className="font-semibold text-primary">QA</span> and{" "}
          <span className="font-semibold text-primary">community</span> — so updates ship smoother
          and players stick around.
        </p>

        {/* Live Roblox counters (visits + CCU), refreshed every 120s. */}
        <div className="mx-auto mt-10 max-w-3xl sm:mt-14">
          <LiveStats initial={liveStats ?? null} />
        </div>
      </div>
    </section>
  );
}
