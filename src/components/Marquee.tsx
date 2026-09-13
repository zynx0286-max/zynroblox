import { ICONS, type MarqueeItem } from "@/lib/site-settings";

export function Marquee({ items }: { items: MarqueeItem[] }) {
  const row = [...items, ...items];

  if (items.length === 0) return null;

  // Scrolls right-to-left: the track starts at translateX(0) and slides to
  // -50% (see `marquee` keyframes in styles.css), so items enter from the
  // right edge and exit on the left, looping seamlessly over the duplicated row.
  return (
    <section dir="ltr" className="relative overflow-hidden py-8">
      <div className="marquee-track flex w-max gap-8">
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
