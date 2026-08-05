import { Bug, Gamepad2, Youtube, Music } from "lucide-react";

const stats = [
  { icon: Bug, value: "9+", label: "Games QA Tested" },
  { icon: Gamepad2, value: "3+", label: "Communities Managed" },
  { icon: Youtube, value: "2", label: "Big YouTubers in games" },
  { icon: Music, value: "2", label: "SFX Projects" },
];

export function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="glass flex items-center gap-4 rounded-2xl px-5 py-5"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="font-display text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
