import { Link } from "@tanstack/react-router";
import { ArrowRight, Star, BadgeCheck } from "lucide-react";
import type { PublicReview } from "@/lib/reviews.functions";
import type { TestimonialItem, TestimonialSettings } from "@/lib/site-settings";

const TRUSTED_BY = [
  "Codex Customs",
  "Fluxwerk",
  "Star Realm",
  "Trading Port",
  "Amazark",
  "Zae Studios",
];

function Stars({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < count ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t: TestimonialItem }) {
  return (
    <figure className="glass flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
      {t.image ? (
        <img
          src={t.image}
          alt={`${t.author} testimonial screenshot`}
          loading="lazy"
          decoding="async"
          className="mb-4 w-full rounded-xl border border-border object-cover"
        />
      ) : null}
      <div className="flex items-center gap-2">
        <Stars count={5} label="5 out of 5 stars" />
        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/70">
          <BadgeCheck className="size-3.5 text-primary" />
          Verified client
        </span>
      </div>

      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/85">
        “{t.quote}”
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
          {t.author.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="font-display text-sm font-semibold">{t.author}</p>
          <p className="text-xs text-muted-foreground">{t.role}</p>
          {t.project ? (
            <p className="mt-0.5 text-[11px] font-medium text-primary/90">{t.project}</p>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}

function ReviewCard({ r }: { r: PublicReview }) {
  return (
    <figure className="glass flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-2">
        <Stars count={r.rating} label={`${r.rating} out of 5 stars`} />
        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/70">
          <BadgeCheck className="size-3.5 text-primary" />
          Community review
        </span>
      </div>

      <p className="mt-3 font-display text-base font-semibold text-foreground">{r.title}</p>
      <blockquote className="mt-1.5 flex-1 text-sm leading-relaxed text-foreground/85">
        “{r.content}”
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
          {r.authorName.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="font-display text-sm font-semibold">{r.authorName}</p>
          <p className="text-xs text-muted-foreground">
            {r.projectRef ? r.projectRef.replace(/-/g, " ") : "Client review"}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

/**
 * One combined wall: admin testimonials first, then community reviews.
 * Used as a preview on the home page and in full on /reviews.
 */
export function ReviewWall({
  testimonials,
  reviews,
  preview = false,
}: {
  testimonials: TestimonialSettings;
  reviews: PublicReview[];
  preview?: boolean;
}) {
  const items = [...testimonials.items];
  const shownReviews = preview ? reviews.slice(0, Math.max(0, 6 - items.length)) : reviews;
  const shownTestimonials = preview ? items.slice(0, 6) : items;

  if (!preview && shownTestimonials.length === 0 && reviews.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-background/35 px-6 py-10 text-center">
        <p className="font-display text-lg font-semibold text-foreground">No reviews yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Be the first — write one using the form and it will appear here instantly.
        </p>
      </div>
    );
  }
  if (shownTestimonials.length === 0 && shownReviews.length === 0) return null;

  return (
    <section id="testimonials" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
      <div className="max-w-2xl">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          {testimonials.heading}
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{testimonials.sub}</h2>
        <p className="mt-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Trusted by teams at
        </p>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Client logos">
          {TRUSTED_BY.map((name) => (
            <span
              key={name}
              className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 font-display text-xs font-semibold text-foreground/80"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shownTestimonials.map((t) => (
          <TestimonialCard key={t.author + t.quote.slice(0, 20)} t={t} />
        ))}
        {shownReviews.map((r) => (
          <ReviewCard key={r.id} r={r} />
        ))}
      </div>

      {preview ? (
        <div className="mt-10 flex justify-center">
          <Link
            to="/reviews"
            className="group glass-card inline-flex items-center justify-center gap-3 rounded-full px-6 py-4 text-center font-display text-base font-bold tracking-wide transition-transform duration-300 hover:scale-[1.02] sm:px-8"
          >
            Read all reviews & write your own
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
