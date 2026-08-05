import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle } from "lucide-react";

export function ContactCta() {
  return (
    <section id="contact" className="relative scroll-mt-28 overflow-hidden px-4 py-24">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="glass-strong relative mx-auto max-w-4xl rounded-3xl px-6 py-14 text-center sm:px-12">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          Contact
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          Need sharper QA, stronger community systems, or clearer player insight?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Discord: @acczyn — usually reply within a day
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://discord.com/users/acczyn"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-display text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[var(--shadow-glow)]"
          >
            <MessageCircle className="size-4" />
            Open Discord
          </a>
          <Link
            to="/work"
            className="group glass inline-flex items-center gap-2 rounded-full px-7 py-3 font-display text-sm font-semibold transition-colors hover:bg-secondary/60"
          >
            View My Work
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
