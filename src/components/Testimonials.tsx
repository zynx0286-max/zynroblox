import { Star } from "lucide-react";
import type { TestimonialSettings } from "@/lib/site-settings";

export function Testimonials({ settings }: { settings: TestimonialSettings }) {
  if (settings.items.length === 0) return null;

  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          {settings.heading}
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          {settings.sub}
        </h2>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {settings.items.map((t) => (
          <figure
            key={t.author + t.quote.slice(0, 20)}
            className="glass flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
          >
            {t.image ? (
              <img
                src={t.image}
                alt={`${t.author} testimonial screenshot`}
                loading="lazy"
                decoding="async"
                className="mb-4 w-full rounded-xl border border-border object-cover"
              />
            ) : null}
            <div className="flex items-center gap-1" aria-label="Verified">
              <Star className="size-4 fill-primary text-primary" />
              <Star className="size-4 fill-primary text-primary" />
              <Star className="size-4 fill-primary text-primary" />
              <Star className="size-4 fill-primary text-primary" />
              <Star className="size-4 fill-primary text-primary" />
            </div>

            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              “{t.quote}”
            </blockquote>

            <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
                {t.author.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-display text-sm font-semibold">{t.author}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}