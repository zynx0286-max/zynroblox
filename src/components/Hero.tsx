import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle } from "lucide-react";
import sfxWaves from "@/assets/sfx-waves.jpg";
import glassGrid from "@/assets/glass-grid.jpg";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pt-36 pb-20 sm:pt-44">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glass absolute -left-16 top-40 hidden w-72 rotate-[-8deg] overflow-hidden rounded-2xl opacity-40 lg:block">
          <img src={sfxWaves} alt="" aria-hidden width={1024} height={768} className="h-40 w-full object-cover mix-blend-screen" />
        </div>
        <div className="glass absolute -right-16 top-56 hidden w-72 rotate-[8deg] overflow-hidden rounded-2xl opacity-40 lg:block">
          <img src={glassGrid} alt="" aria-hidden width={1024} height={768} className="h-40 w-full object-cover mix-blend-screen" />
        </div>
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <p className="rise-in font-display text-3xl font-bold tracking-[0.45em] text-primary sm:text-4xl">
          ZYN
        </p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-4 py-1.5 font-display text-[0.7rem] tracking-[0.25em] text-muted-foreground uppercase">
          <span className="size-1.5 rounded-full bg-primary" />
          Roblox Freelance Portfolio
        </p>

        <h1 className="mt-6 font-display text-4xl leading-[1.05] font-bold sm:text-6xl">
          Roblox <span className="bg-primary px-2 text-primary-foreground">QA Tester</span>
          <br />& Community Specialist
        </h1>

        <p className="mt-5 font-display text-sm tracking-[0.2em] text-primary uppercase sm:text-base">
          I am a professional SFX artist
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Helping Roblox developers improve player experience through rigorous QA
          testing, community management, game analysis, and original sound design.
        </p>


        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/work"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-display text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[var(--shadow-glow)]"
          >
            View My Work
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="https://discord.com/users/acczyn"
            target="_blank"
            rel="noreferrer"
            className="glass inline-flex items-center gap-2 rounded-full px-7 py-3 font-display text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
          >
            <MessageCircle className="size-4" />
            Contact Me
          </a>
        </div>
      </div>
    </section>
  );
}
