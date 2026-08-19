import { Check } from "lucide-react";
import { GlassFrame } from "@/components/GlassFrame";
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
              <li key={p} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="size-3" />
                </span>
                <span className="text-muted-foreground">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <GlassFrame ratio="aspect-[4/3]">
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface/40 text-center">
              <span className="font-display text-5xl font-bold text-primary">{settings.badge}</span>
              <p className="max-w-[16rem] text-xs text-muted-foreground">{settings.badgeCopy}</p>
            </div>
          </GlassFrame>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-2xl px-5 py-5">
              <p className="font-display text-2xl font-bold">{settings.stat1.value}</p>
              <p className="text-xs text-muted-foreground">{settings.stat1.label}</p>
            </div>
            <div className="glass rounded-2xl px-5 py-5">
              <p className="font-display text-2xl font-bold">{settings.stat2.value}</p>
              <p className="text-xs text-muted-foreground">{settings.stat2.label}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
