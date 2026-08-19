import { ICONS, type ServiceItem } from "@/lib/site-settings";

export function Services({ items }: { items: ServiceItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          Services
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          Sound first — plus everything around it.
        </h2>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => {
          const Icon = ICONS[s.icon] ?? ICONS.audio;
          return (
            <article
              key={s.title}
              className="group rounded-2xl border border-border bg-surface/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.copy}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
