import {
  Bug,
  Users,
  MessageSquare,
  Search,
  ShieldCheck,
  AudioLines,
  Gamepad2,
  FileText,
} from "lucide-react";

const items = [
  { icon: AudioLines, label: "SFX Design", copy: "Ability, ambience and UI audio." },
  { icon: Bug, label: "QA Testing", copy: "Detailed bug reports with repro steps." },
  { icon: Users, label: "Community", copy: "Discord setup, events and growth." },
  { icon: MessageSquare, label: "Player Feedback", copy: "Insight that improves retention." },
  { icon: Search, label: "Game Research", copy: "Trend and competitor analysis." },
  { icon: ShieldCheck, label: "Moderation", copy: "Anti-raid and rule enforcement." },
  { icon: Gamepad2, label: "Roblox Native", copy: "Active player and tester." },
  { icon: FileText, label: "Documentation", copy: "Structured, readable test docs." },
];


export function Marquee() {
  const row = [...items, ...items];

  return (
    <section className="relative overflow-hidden border-y border-border py-8">
      <div className="marquee-track flex w-max gap-12">
        {row.map((item, i) => (
          <div key={`${item.label}-${i}`} className="flex w-72 shrink-0 items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/40 text-primary">
              <item.icon className="size-5" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold tracking-wide uppercase">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{item.copy}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </section>
  );
}
