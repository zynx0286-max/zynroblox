import { Star } from "lucide-react";
import type { Testimonial } from "@/lib/site.functions";

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const items = testimonials.filter((t) => t.text).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          Testimonials
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          What clients and communities say.
        </h2>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <figure
            key={t.id}
            className="glass flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-1" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${i < t.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
                />
              ))}
            </div>

            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
              “{t.text}”
            </blockquote>

            <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
              {t.imageUrl ? (
                <img
                  src={t.imageUrl}
                  alt=""
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
                  {t.author.charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <p className="font-display text-sm font-semibold">{t.author}</p>
                {t.role ? <p className="text-xs text-muted-foreground">{t.role}</p> : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
