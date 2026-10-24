import { Link } from "@tanstack/react-router";
import { ArrowRight, Star, BadgeCheck } from "lucide-react";
import type { PublicReview } from "@/lib/reviews.functions";
import type { TestimonialItem, TestimonialSettings } from "@/lib/site-settings";
import { safeExternalUrl } from "@/lib/url";

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
    <div className="flex items-center gap-0.5" aria-label={label}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < count ? "fill-primary text-primary" : "text-muted-foreground/25"}`}
        />
      ))}
    </div>
  );
}

const cardClass =
  "editorial-card relative flex h-full flex-col p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40";

function QuoteMark() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-3 right-5 font-display text-6xl leading-none text-primary/15 select-none"
    >
      “
    </span>
  );
}

function TestimonialCard({ t }: { t: TestimonialItem }) {
  const image = safeExternalUrl(t.image);
  return (
    <figure className={cardClass}>
      <QuoteMark />
      {image ? (
        <img
          src={image}
          alt={`${t.author} testimonial screenshot`}
          loading="lazy"
          decoding="async"
          className="mb-4 w-full rounded-xl border border-border object-cover"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Stars count={5} label="5 out of 5 stars" />
        <span className="inline-flex items-center gap-1 font-mono text-[0.55rem] tracking-[0.08em] text-muted-foreground uppercase">
          <BadgeCheck className="size-3 text-primary" />
          Verified client
        </span>
      </div>

      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/85">
        “{t.quote}”
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <span className="flex size-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 font-mono text-xs font-semibold text-primary">
          {t.author.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="font-display text-sm font-semibold">{t.author}</p>
          <p className="font-mono text-[0.55rem] tracking-[0.08em] text-muted-foreground uppercase">
            {t.role}
          </p>
          {t.project ? (
            <p className="mt-0.5 font-mono text-[0.54rem] tracking-[0.06em] text-primary/90 uppercase">
              {t.project}
            </p>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}

function ReviewCard({ r }: { r: PublicReview }) {
  return (
    <figure className={cardClass}>
      <QuoteMark />
      <div className="flex flex-wrap items-center gap-2">
        <Stars count={r.rating} label={`${r.rating} out of 5 stars`} />
        <span className="inline-flex items-center gap-1 font-mono text-[0.55rem] tracking-[0.08em] text-muted-foreground uppercase">
          <BadgeCheck className="size-3 text-primary" />
          Community review
        </span>
      </div>

      <p className="mt-4 font-display text-base font-semibold text-foreground">{r.title}</p>
      <blockquote className="mt-1.5 flex-1 text-sm leading-relaxed text-foreground/85">
        “{r.content}”
      </blockquote>

      {r.screenshotUrls.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.screenshotUrls
            .map((u) => safeExternalUrl(u))
            .filter((u): u is string => !!u)
            .slice(0, 4)
            .map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="block">
                <img
                  src={u}
                  alt={`${r.authorName} screenshot ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="size-14 rounded-lg border border-border object-cover"
                />
              </a>
            ))}
        </div>
      ) : null}

      <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <span className="flex size-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 font-mono text-xs font-semibold text-primary">
          {r.authorName.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="font-display text-sm font-semibold">{r.authorName}</p>
          <p className="font-mono text-[0.55rem] tracking-[0.08em] text-muted-foreground uppercase">
            {r.projectRef ? r.projectRef.replace(/-/g, " ") : "Client review"}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

/**
 * One combined wall: admin testimonials first, then community reviews.
 * Used as a preview on the home page, in full on /reviews, and as a bare
 * card grid under the reviews page's own header.
 */
export function ReviewWall({
  testimonials,
  reviews,
  preview = false,
  bare = false,
}: {
  testimonials: TestimonialSettings;
  reviews: PublicReview[];
  preview?: boolean;
  bare?: boolean;
}) {
  const items = [...testimonials.items];
  const shownReviews = preview ? reviews.slice(0, Math.max(0, 6 - items.length)) : reviews;
  const shownTestimonials = preview ? items.slice(0, 6) : items;

  if (!preview && shownTestimonials.length === 0 && reviews.length === 0) {
    return (
      <div className="mx-auto max-w-xl border border-border bg-card px-6 py-10 text-center">
        <p className="font-display text-lg font-semibold text-foreground">No reviews yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Be the first — write one using the form and it will appear here instantly.
        </p>
      </div>
    );
  }
  if (shownTestimonials.length === 0 && shownReviews.length === 0) return null;

  const shown = shownTestimonials.length + shownReviews.length;

  const cards = (
    <>
      {shownTestimonials.map((t) => (
        <TestimonialCard key={t.author + t.quote.slice(0, 20)} t={t} />
      ))}
      {shownReviews.map((r) => (
        <ReviewCard key={r.id} r={r} />
      ))}
    </>
  );

  if (bare) {
    return (
      <section id="testimonials" className="border-t border-border">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
            <div>
              <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                <span className="text-primary">All</span> reviews
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
                In their words.
              </h2>
            </div>
            <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground/60 uppercase">
              {String(shown).padStart(2, "0")} total
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="border-t border-border">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-[clamp(4.5rem,8vw,8rem)] sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:text-[0.64rem]">
            <span className="text-primary">{preview ? "04" : "Reviews"}</span>
            <span aria-hidden className="h-px w-6 bg-primary/60" />
            {testimonials.heading}
          </p>
          <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground/60 uppercase">
            {String(shown).padStart(2, "0")} {preview ? "shown" : "total"}
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-12">
          <h2 className="max-w-[22ch] font-display text-[clamp(1.95rem,4.6vw,4.25rem)] leading-[0.94] font-black tracking-[-0.055em]">
            {testimonials.sub}
          </h2>
          <div className="lg:justify-self-end">
            <p className="font-mono text-[0.56rem] tracking-[0.14em] text-muted-foreground/60 uppercase">
              Trusted by teams at
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="Client logos">
              {TRUSTED_BY.map((name) => (
                <span
                  key={name}
                  className="font-mono text-[0.58rem] tracking-[0.06em] text-muted-foreground uppercase"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-10 grid gap-4 sm:grid-cols-2 ${preview ? "" : "lg:grid-cols-3"}`}>
          {cards}
        </div>

        {preview ? (
          <div className="mt-10 flex justify-end border-t border-border pt-5">
            <Link
              to="/reviews"
              className="group inline-flex items-center gap-2 border-b border-primary/50 pb-1 font-display text-[0.7rem] font-bold tracking-[0.12em] text-foreground uppercase transition-colors hover:border-primary"
            >
              Read all reviews &amp; write your own
              <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
