import { ICONS, type ProcessSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

/**
 * "How I work" — a numbered, icon-led process strip that sets expectations
 * for new clients and builds trust before they ever reach out.
 */
export function Process({ settings }: { settings: ProcessSettings }) {
  return (
    <section id="process" className="relative overflow-hidden py-16 sm:py-24">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            Process
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-bold sm:text-4xl">
            {settings.heading}
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{settings.sub}</p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {settings.steps.map((step, i) => {
            const Icon = ICONS[step.icon] ?? ICONS.star;
            return (
              <Reveal key={step.title} delay={(i % 4) * 80}>
                <article className="glass-card group relative h-full overflow-hidden rounded-2xl p-6">
                  <span className="pointer-events-none absolute -top-3 -right-1 font-display text-7xl font-bold text-foreground/5 transition-colors group-hover:text-primary/10">
                    {i + 1}
                  </span>
                  <div
                    className={cn(
                      "grid size-11 place-items-center rounded-xl bg-primary/15 text-primary",
                      "transition-transform duration-300 group-hover:-translate-y-0.5",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
