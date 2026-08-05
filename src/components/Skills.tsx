const skills = [
  "Game Testing",
  "Bug Reporting",
  "Test Documentation",
  "Player Feedback",
  "Discord Management",
  "Community Growth",
  "Game Analysis",
  "Roblox Platform",
  "Discord Moderation",
  "SFX Design",
];

export function Skills() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          Skill Set
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          Practical skills for games and their players.
        </h2>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {skills.map((s) => (
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
          Currently working on
        </p>
        <p className="mt-3 text-muted-foreground">
          Building better QA workflows, studying Roblox trends, developing SFX
          design skills, and growing a full toolkit for creators who care about
          player experience.
        </p>
      </div>
    </section>
  );
}
