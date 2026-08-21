import { ICONS, type StatsSettings } from "@/lib/site-settings";
import { AnimatedCounter } from "./AnimatedCounter";

export function Stats({ settings }: { settings: StatsSettings }) {
  if (settings.items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {settings.items.map((s) => {
          const Icon = ICONS[s.icon] ?? ICONS.star;
          const numValue =
            typeof s.value === "string" ? parseInt(s.value.replace(/\D/g, ""), 10) : s.value;
          const suffix = typeof s.value === "string" ? s.value.replace(/[\d,]/g, "").trim() : "";
          return (
            <div key={s.label} className="glass flex items-center gap-4 rounded-2xl px-5 py-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-display text-2xl font-bold">
                  <AnimatedCounter value={numValue} suffix={suffix} duration={2000} />
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
