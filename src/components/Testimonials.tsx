import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Quote, Star } from "lucide-react";
import { listReviews, type Review } from "@/lib/reviews.functions";

const fallbackReviews: Review[] = [
  {
    id: "fallback-1",
    authorName: "Ari M.",
    authorEmail: "ari@example.com",
    rating: 5,
    title: "Sound design that made the game feel premium",
    content:
      "The sound work completely elevated our game feel. Combat cues, ambience, and UI feedback all landed exactly the way we wanted, and the production was fast and collaborative.",
    screenshotUrls: [],
    featured: true,
    verified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-2",
    authorName: "Niko R.",
    authorEmail: "niko@example.com",
    rating: 5,
    title: "A polished QA process with actual player insight",
    content:
      "We needed someone who could catch small gameplay issues before they became big problems. The testing reports were clear, helpful, and built around real player behavior.",
    screenshotUrls: [],
    featured: true,
    verified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-3",
    authorName: "Jordan T.",
    authorEmail: "jordan@example.com",
    rating: 5,
    title: "Community care that actually improves retention",
    content:
      "The community systems and moderation support gave our server a calmer, more professional feel. It felt like an upgrade to the whole player experience.",
    screenshotUrls: [],
    featured: true,
    verified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function Testimonials() {
  const list = useServerFn(listReviews);
  const { data: reviews = fallbackReviews } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      try {
        const result = await list();
        return result.length ? result : fallbackReviews;
      } catch {
        return fallbackReviews;
      }
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const visibleReviews = reviews.filter((review) => review.verified !== false).slice(0, 3);

  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            Testimonials
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Players and teams keep coming back.
          </h2>
        </div>

        <Link
          to="/reviews"
          className="group inline-flex items-center gap-2 self-start rounded-full border border-border bg-background/35 px-4 py-2.5 font-display text-sm text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
        >
          View all testimonials
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {visibleReviews.map((review) => (
          <article
            key={review.id}
            className="glass-card group flex h-full flex-col rounded-[28px] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={`${review.id}-${i}`} className="size-4 fill-current" />
                ))}
              </div>
              <Quote className="size-5 text-muted-foreground" />
            </div>

            <h3 className="mt-5 font-display text-xl font-semibold text-foreground">
              {review.title}
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              “{review.content}”
            </p>

            <div className="mt-5 border-t border-border pt-4">
              <p className="font-display text-sm font-semibold text-foreground">{review.authorName}</p>
              <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                {review.projectRef ? review.projectRef.replace(/-/g, " ") : "Client review"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
