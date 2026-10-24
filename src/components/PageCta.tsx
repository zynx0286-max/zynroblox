import { ArrowUpRight, Mail } from "lucide-react";
import { useContactSettings } from "./ContactSettingsProvider";
import { Magnetic } from "./Magnetic";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Closing call-to-action for inner pages. Shares the home page's blue accent
 * and oversized type without repeating the full contact form.
 */
export function PageCta({
  kicker = "Next step",
  title = "Have something that needs a closer ear?",
  copy,
  secondary,
  className,
}: {
  kicker?: string;
  title?: ReactNode;
  copy?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  const { discordUrl, email, replyNote } = useContactSettings();

  return (
    <section className={cn("border-t border-border", className)}>
      <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="relative overflow-hidden rounded-[30px] border border-border bg-surface px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 100% at 85% 20%, color-mix(in oklab, var(--primary) 28%, transparent), transparent 65%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-[-0.04em] bottom-[-0.18em] select-none font-display text-[clamp(5rem,15vw,12rem)] leading-[0.7] font-black tracking-[-0.09em] text-foreground/[0.045] uppercase"
          >
            Talk
          </span>

          <div className="relative z-10 grid gap-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12">
            <div>
              <p className="flex items-center gap-2 font-mono text-[0.6rem] tracking-[0.18em] text-primary uppercase">
                <span aria-hidden>→</span>
                {kicker}
              </p>
              <h2 className="mt-5 max-w-[20ch] font-display text-[clamp(2rem,4.6vw,4rem)] leading-[0.94] font-black tracking-[-0.055em]">
                {title}
              </h2>
              {copy ? (
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  {copy}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end">
              <Magnetic strength={8}>
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track("discord_click", { from: "page_cta" })}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-6 py-4 font-display text-[0.72rem] font-bold tracking-[0.12em] text-primary-foreground uppercase shadow-[var(--shadow-glow)] transition-colors hover:bg-primary/90 sm:px-7"
                >
                  Start a project
                  <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </Magnetic>
              <a
                href={`mailto:${email}`}
                className="group inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.62rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
              >
                <Mail className="size-3.5 text-primary" />
                {email}
              </a>
              {secondary ? <div className="mt-1">{secondary}</div> : null}
              <p className="mt-1 flex items-center gap-2 font-mono text-[0.52rem] tracking-[0.12em] text-muted-foreground/60 uppercase lg:justify-end">
                <span className="zyn-live-dot" aria-hidden />
                {replyNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
