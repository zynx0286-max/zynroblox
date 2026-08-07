import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, AudioLines, Headphones } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export function Hero() {
  return (
    <section
      id="home"
      className="relative isolate overflow-hidden pt-36 pb-24 sm:pt-44 sm:pb-32"
    >
      {/* Full-bleed blurred background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          width={1920}
          height={1088}
          className="h-full w-full scale-125 object-cover opacity-70 blur-[10px]"
        />
        <div className="absolute inset-0 bg-background/60" />
        <div className="hero-glow absolute inset-0" />
        {/* Soft floating light blooms */}
        <div className="float-slow absolute -top-20 -left-24 size-[28rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="float-slow absolute -right-24 top-24 size-[24rem] rounded-full bg-accent/20 blur-[130px] [animation-delay:-4s]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
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
        <p className="rise-in font-display text-3xl font-bold tracking-[0.45em] text-primary sm:text-4xl">
          ZYN
        </p>

        <p className="glass-card mt-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-[0.7rem] tracking-[0.25em] text-muted-foreground uppercase">
          <AudioLines className="size-3.5 text-primary" />
          Roblox Sound Design Portfolio
        </p>

        <h1 className="mt-6 font-display text-4xl leading-[1.05] font-bold sm:text-6xl">
          Professional <span className="bg-primary px-2 text-primary-foreground">SFX Artist</span>
          <br />for Roblox games
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          I craft original sound effects — abilities, impacts, UI and ambience —
          that make Roblox games feel alive. Alongside audio I also handle QA
          testing, community management and game research.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/work"
            className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-10 py-5 font-display text-lg font-bold tracking-wide text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 hover:scale-[1.03] sm:w-auto sm:text-xl"
          >
            <Headphones className="size-6" />
            Hear My Work
            <ArrowRight className="size-6 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="https://discord.com/users/acczyn"
            target="_blank"
            rel="noreferrer"
            className="glass-card inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-5 font-display text-base font-semibold text-foreground transition-colors hover:bg-secondary/50 sm:w-auto"
          >
            <MessageCircle className="size-5 text-primary" />
            Message me on Discord
          </a>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          18 projects in the portfolio — sound design, QA and community work.
        </p>

        <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "SFX Projects", v: "2+" },
            { k: "Games Tested", v: "9+" },
            { k: "Communities", v: "3+" },
            { k: "Reply Time", v: "48h" },
          ].map((s) => (
            <div key={s.k} className="glass-card rounded-2xl px-4 py-5">
              <dt className="font-display text-2xl font-bold text-primary">{s.v}</dt>
              <dd className="mt-1 text-[0.7rem] tracking-[0.15em] text-muted-foreground uppercase">
                {s.k}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
