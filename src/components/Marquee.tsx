import { ICONS, type MarqueeItem } from "@/lib/site-settings";

export function Marquee({ items }: { items: MarqueeItem[] }) {
  const row = [...items, ...items];

  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-8">
      <div className="marquee-track flex w-max gap-8 animate-marquee">
        {row.map((item, i) => {
          const Icon = ICONS[item.icon] ?? ICONS.audio;
          return (
            <div
              key={`${item.label}-${i}`}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
