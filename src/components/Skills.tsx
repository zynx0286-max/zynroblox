import type { SkillsSettings } from "@/lib/site-settings";

export function Skills({ settings }: { settings: SkillsSettings }) {
  if (settings.items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          Skill Set
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{settings.heading}</h2>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {settings.items.map((s) => (
          <span
            key={s}
            className="rounded-full border border-border bg-secondary/40 px-4 py-2 font-display text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="glass mt-10 rounded-2xl p-6">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          {settings.currentlyHeading}
        </p>
        <p className="mt-3 text-muted-foreground">{settings.currently}</p>
      </div>
    </section>
  );
}
