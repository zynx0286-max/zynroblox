import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, AudioLines } from "lucide-react";
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
          className="h-full w-full scale-110 object-cover opacity-60 blur-[3px]"
        />
        <div className="absolute inset-0 bg-background/55" />
        <div className="hero-glow absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <p className="rise-in font-display text-3xl font-bold tracking-[0.45em] text-primary sm:text-4xl">
          ZYN
        </p>

        <p className="glass mt-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-[0.7rem] tracking-[0.25em] text-muted-foreground uppercase">
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

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/work"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-display text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[var(--shadow-glow)]"
          >
            Hear My Work
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

        <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "SFX Projects", v: "2+" },
            { k: "Games Tested", v: "9+" },
            { k: "Communities", v: "3+" },
            { k: "Reply Time", v: "48h" },
          ].map((s) => (
            <div key={s.k} className="glass rounded-2xl px-4 py-5">
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
