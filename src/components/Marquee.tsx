import { ICONS, type MarqueeItem } from "@/lib/site-settings";

export function Marquee({ items }: { items: MarqueeItem[] }) {
  const row = [...items, ...items];

  if (items.length === 0) return null;

  // Scrolls right-to-left: the track starts at translateX(0) and slides to
  // -50% (see `marquee` keyframes in styles.css), so items enter from the
  // right edge and exit on the left, looping seamlessly over the duplicated row.
  return (
    <section
      dir="ltr"
      aria-label="What I do"
      className="relative overflow-hidden border-b border-border py-4"
    >
      <div className="marquee-track flex w-max items-center gap-7 hover:[animation-play-state:paused]">
        {row.map((item, i) => {
          const Icon = ICONS[item.icon] ?? ICONS.audio;
          return (
            <span
              key={`${item.label}-${i}`}
              title={item.copy}
              className="flex items-center gap-2.5 whitespace-nowrap font-mono text-[0.58rem] tracking-[0.16em] text-muted-foreground uppercase sm:text-[0.62rem]"
            >
              <Icon className="size-3 text-primary" aria-hidden />
              {item.label}
              <span aria-hidden className="ml-5 size-1 rounded-full bg-primary/50" />
            </span>
          );
        })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent"
      />
    </section>
  );
}
