import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, AudioLines, Headphones } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { track } from "@/lib/analytics";
import { works } from "@/data/works";

export function Hero() {
  return (
    <section
      id="home"
      className="relative isolate overflow-hidden pt-28 pb-16 sm:pt-44 sm:pb-32"
    >
      {/* Full-bleed blurred background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          width={1920}
          height={1088}
          className="h-full w-full scale-110 object-cover opacity-70 blur-[8px] sm:scale-125 sm:blur-[10px]"
        />
        <div className="absolute inset-0 bg-background/60" />
        <div className="hero-glow absolute inset-0" />
        {/* Soft floating light blooms */}
        <div className="float-slow absolute -top-20 -left-24 size-[18rem] rounded-full bg-primary/20 blur-[100px] sm:size-[28rem] sm:blur-[120px]" />
        <div className="float-slow absolute -right-24 top-24 size-[16rem] rounded-full bg-accent/20 blur-[110px] [animation-delay:-4s] sm:size-[24rem] sm:blur-[130px]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background sm:h-64" />
      </div>

      {/* Floating glass panels */}
      <div
        aria-hidden
        className="glass-card float-slow pointer-events-none absolute top-40 -left-16 hidden h-40 w-72 rotate-[-8deg] rounded-3xl lg:block"
      />
      <div
        aria-hidden
        className="glass-card float-slow pointer-events-none absolute bottom-24 -right-14 hidden h-44 w-72 rotate-[7deg] rounded-3xl [animation-delay:-3s] lg:block"
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <p className="rise-in font-display text-2xl font-bold tracking-[0.35em] text-primary sm:text-4xl sm:tracking-[0.45em]">
          ZYN
        </p>

        <p className="glass-card mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-display text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:mt-6 sm:px-4 sm:text-[0.7rem] sm:tracking-[0.25em]">
          <AudioLines className="size-3.5 text-primary" />
          Roblox Sound Design Portfolio
        </p>

        <h1 className="mt-5 font-display text-[2rem] leading-[1.08] font-bold sm:mt-6 sm:text-6xl sm:leading-[1.05]">
          Professional{" "}
          <span className="inline-block bg-primary px-2 text-primary-foreground">SFX Artist</span>
          <br className="hidden sm:block" /> for Roblox games
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground sm:mt-6 sm:text-lg">
          I craft original sound effects — abilities, impacts, UI and ambience —
          that make Roblox games feel alive. Alongside audio I also handle QA
          testing, community management and game research.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Link
            to="/work"
            onClick={() => track("cta_click", { cta: "hear_my_work" })}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-primary px-6 py-4 font-display text-base font-bold tracking-wide text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] sm:w-auto sm:gap-3 sm:px-10 sm:py-5 sm:text-xl"
          >
            <Headphones className="size-5 sm:size-6" />
            Hear My Work
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 sm:size-6" />
          </Link>
          <a
            href="https://discord.com/users/acczyn"
            target="_blank"
            rel="noreferrer"
            onClick={() => track("discord_click", { from: "hero" })}
            className="glass-card inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 font-display text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50 active:scale-[0.98] sm:w-auto sm:px-8 sm:py-5 sm:text-base"
          >
            <MessageCircle className="size-5 text-primary" />
            Message me on Discord
          </a>
        </div>

        <p className="mt-4 text-[0.7rem] text-muted-foreground sm:text-xs">
          {works.length} projects in the portfolio — sound design, QA and community work.
        </p>

        <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-2.5 sm:mt-14 sm:grid-cols-4 sm:gap-3">
          {[
            { k: "SFX Projects", v: "2+" },
            { k: "Games Tested", v: "20+" },
            { k: "Communities", v: "7+" },
            { k: "Reply Time", v: "48h" },
          ].map((s) => (
            <div key={s.k} className="glass-card rounded-2xl px-3 py-4 sm:px-4 sm:py-5">
              <dt className="font-display text-xl font-bold text-primary sm:text-2xl">{s.v}</dt>
              <dd className="mt-1 text-[0.62rem] tracking-[0.12em] text-muted-foreground uppercase sm:text-[0.7rem] sm:tracking-[0.15em]">
                {s.k}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
