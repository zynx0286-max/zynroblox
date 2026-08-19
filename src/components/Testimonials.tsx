import { Link } from "@tanstack/react-router";
import { ArrowRight, Star } from "lucide-react";
import type { Testimonial } from "@/lib/site.functions";
import type { Review } from "@/lib/reviews.functions";

type ReviewItem = {
  id: string;
  rating: number;
  title?: string;
  text: string;
  author: string;
  label?: string;
  imageUrl?: string;
};

export function Testimonials({
  testimonials,
  reviews,
}: {
  testimonials: Testimonial[];
  reviews: Review[];
}) {
  const fromReviews: ReviewItem[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    text: r.content,
    author: r.authorName,
    label: r.projectRef ? r.projectRef.replace(/-/g, " ") : "Client review",
  }));
  const fromAdmin: ReviewItem[] = testimonials
    .filter((t) => t.text)
    .map((t) => ({
      id: t.id,
      rating: t.rating,
      text: t.text,
      author: t.author,
      ...(t.role ? { label: t.role } : {}),
      ...(t.imageUrl ? { imageUrl: t.imageUrl } : {}),
    }));

  const items = [...fromReviews, ...fromAdmin].slice(0, 6);
  if (items.length === 0) return null;
  const hasMore = fromReviews.length > 3 || fromReviews.length + fromAdmin.length > 6;

  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-4 py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            Testimonials
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Players and teams keep coming back.
          </h2>
        </div>

        {hasMore ? (
          <Link
            to="/reviews"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-border bg-background/35 px-4 py-2.5 font-display text-sm text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
          >
            View all testimonials
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : null}
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

            {t.title ? (
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {t.title}
              </h3>
            ) : null}

            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
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
                {t.label ? <p className="text-xs text-muted-foreground">{t.label}</p> : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
