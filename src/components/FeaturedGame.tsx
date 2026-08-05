import { Youtube, Star } from "lucide-react";
import { GlassImage } from "@/components/GlassFrame";
import { works } from "@/data/works";

const creators = [
  { name: "KreekCraft", subs: "6.5M subs" },
  { name: "Caylus", subs: "9.8M subs" },
];

export function FeaturedGame() {
  const featured = works.find((w) => w.featured);
  if (!featured) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="glass grid gap-8 rounded-3xl p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
        <GlassImage
          src={featured.image}
          alt={`${featured.title} screenshot`}
          ratio="aspect-[16/10]"
        />

        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 font-display text-[0.65rem] tracking-[0.25em] text-primary uppercase">
            <Star className="size-3" />
            Featured Game
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold">{featured.title}</h2>
          <p className="mt-3 text-muted-foreground">{featured.description}</p>

          <ul className="mt-6 space-y-3">
            {creators.map((c) => (
              <li
                key={c.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm"
              >
                <Youtube className="size-4 shrink-0 text-primary" />
                <span className="font-semibold">{c.name}</span>
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
