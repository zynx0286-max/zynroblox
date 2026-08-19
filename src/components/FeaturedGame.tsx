import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Youtube, Star } from "lucide-react";
import { GlassImage } from "@/components/GlassFrame";
import { listWorks } from "@/lib/works.functions";

const creators = [
  { name: "KreekCraft", subs: "6.5M subs" },
  { name: "Caylus", subs: "9.8M subs" },
];

export function FeaturedGame() {
  const list = useServerFn(listWorks);
  const { data: works = [] } = useQuery({ queryKey: ["works"], queryFn: () => list() });
  const featured = works.find((w) => w.featured);
  if (!featured) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="glass-card relative grid gap-8 overflow-hidden rounded-[32px] p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),transparent_35%)]" />

        <div className="relative">
          <GlassImage
            src={featured.image}
            alt={`${featured.title} screenshot`}
            ratio="aspect-[16/10]"
          />
        </div>

        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 font-display text-[0.65rem] tracking-[0.25em] text-primary uppercase">
            <Star className="size-3" />
            Featured Game
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
            {featured.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {featured.description}
          </p>

          <ul className="mt-6 space-y-3">
            {creators.map((c) => (
              <li
                key={c.name}
                className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
              >
                <Youtube className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">{c.name}</span>
                <span className="text-muted-foreground">({c.subs})</span>
                <span className="hidden text-muted-foreground sm:inline">
                  — made content in this game
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
