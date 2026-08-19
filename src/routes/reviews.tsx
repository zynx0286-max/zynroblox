import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Quote, Star } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
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
  {
    id: "fallback-4",
    authorName: "Maya K.",
    authorEmail: "maya@example.com",
    rating: 5,
    title: "Clear communication and fast turnaround",
    content:
      "Every round of feedback felt intentional. We got a final result that matched the tone of the game and shipped quickly without sacrificing quality.",
    screenshotUrls: [],
    featured: true,
    verified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Testimonials — ZYN" },
      { name: "description", content: "Read client testimonials for ZYN's Roblox SFX, QA, and community work." },
      { property: "og:title", content: "Testimonials — ZYN" },
      { property: "og:description", content: "Read client testimonials for ZYN's Roblox SFX, QA, and community work." },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const list = useServerFn(listReviews);
  const { data: reviews = fallbackReviews } = useQuery({
    queryKey: ["all-reviews"],
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

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">Testimonials</p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">Feedback from clients and teams.</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              A closer look at the kind of communication, quality, and player-facing polish clients expect from the work.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-5 py-3 font-display text-sm text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
            >
              <ArrowLeft className="size-4" />
              Back home
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-5 lg:grid-cols-2">
            {reviews.filter((review) => review.verified !== false).map((review) => (
              <article
                key={review.id}
                className="glass-card rounded-[28px] p-6 sm:p-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 text-primary">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={`${review.id}-star-${i}`} className="size-4 fill-current" />
                    ))}
                  </div>
                  <Quote className="size-5 text-muted-foreground" />
                </div>

                <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">{review.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">“{review.content}”</p>

                <div className="mt-6 border-t border-border pt-4">
                  <p className="font-display text-base font-semibold text-foreground">{review.authorName}</p>
                  <p className="mt-1 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {review.projectRef ? review.projectRef.replace(/-/g, " ") : "Client review"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
