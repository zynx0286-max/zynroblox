import { Check } from "lucide-react";
import { GlassFrame } from "@/components/GlassFrame";
import { AnimatedCounter } from "./AnimatedCounter";
import carpetCleaning from "@/assets/carpet-cleaning-simulator.png";
import type { AboutSettings } from "@/lib/site-settings";

export function About({ settings }: { settings: AboutSettings }) {
  return (
    <section id="about" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            About Me
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{settings.heading}</h2>
          <p className="mt-5 text-muted-foreground">{settings.body}</p>

          <ul className="mt-8 space-y-3">
            {settings.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="font-medium text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <GlassFrame ratio="aspect-[4/3]">
            <img
              src={carpetCleaning}
              alt="Carpet Cleaning Simulator — QA tested Roblox game"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </GlassFrame>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-2xl border-l-2 border-l-primary px-5 py-5">
              <p className="font-display text-2xl font-bold tracking-tight">
                <AnimatedCounter value={settings.stat1.value} duration={1800} ssrStart />
              </p>
              <p className="mt-1 text-sm leading-snug font-semibold text-foreground/90">
                {settings.stat1.label}
              </p>
            </div>
            <div className="glass rounded-2xl border-l-2 border-l-primary px-5 py-5">
              <p className="font-display text-2xl font-bold tracking-tight">
                <AnimatedCounter value={settings.stat2.value} duration={1800} ssrStart />
              </p>
              <p className="mt-1 text-sm leading-snug font-semibold text-foreground/90">
                {settings.stat2.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
