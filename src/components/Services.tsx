import { Bug, Users, MessageSquare, Search, ShieldCheck, AudioLines } from "lucide-react";

const services = [
  {
    icon: Bug,
    title: "Roblox QA Testing",
    copy: "Finding bugs, testing features, and delivering detailed reports with clear reproduction steps.",
  },
  {
    icon: Users,
    title: "Community Management",
    copy: "Discord setup, event organizing, moderation systems, and member growth.",
  },
  {
    icon: MessageSquare,
    title: "Game Feedback",
    copy: "Player-focused feedback that improves retention and gameplay flow.",
  },
  {
    icon: Search,
    title: "Game Research",
    copy: "Analyzing trends, competitor games, and player behavior to find opportunities.",
  },
  {
    icon: ShieldCheck,
    title: "Discord Moderation",
    copy: "Consistent rule enforcement, anti-raid setups, and a healthier server culture.",
  },
  {
    icon: AudioLines,
    title: "SFX Design",
    copy: "Sound effects for Roblox games — abilities, ambience, UI audio, and more.",
  },
];

export function Services() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          Services
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          Ways I can help your Roblox project.
        </h2>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <article
            key={s.title}
            className="group rounded-2xl border border-border bg-surface/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <s.icon className="size-5" />
            </span>
            <h3 className="mt-5 font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
