import { ICONS, type MarqueeItem } from "@/lib/site-settings";

export function Marquee({ items }: { items: MarqueeItem[] }) {
  const row = [...items, ...items];

  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-y border-border py-8">
      <div className="marquee-track flex w-max gap-12">
        {row.map((item, i) => {
          const Icon = ICONS[item.icon] ?? ICONS.audio;
          return (
            <div key={`${item.label}-${i}`} className="flex w-72 shrink-0 items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/40 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold tracking-wide uppercase">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.copy}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </section>
  );
}
