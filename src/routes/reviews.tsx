import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Quote, Star } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReviewForm } from "@/components/ReviewForm";
import { getPublicReviews } from "@/lib/public-data";
import { SITE_URL } from "@/data/works";

export const Route = createFileRoute("/reviews")({
  loader: async () => ({ reviews: await getPublicReviews() }),
  head: () => ({
    meta: [
      { title: "Testimonials — ZYN" },
      {
        name: "description",
        content:
          "Read client testimonials for ZYN's Roblox SFX, QA testing, community management and game research work.",
      },
      { property: "og:title", content: "Testimonials — ZYN" },
      {
        property: "og:description",
        content:
          "Read client testimonials for ZYN's Roblox SFX, QA testing, community management and game research work.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/reviews` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/reviews` }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { reviews } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              Testimonials
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Feedback from clients and teams.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              A closer look at the kind of communication, quality, and player-facing polish clients
              expect from the work.
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
          <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              {reviews.length === 0 ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-border bg-background/35 px-6 py-10 text-center">
                  <p className="font-display text-lg font-semibold text-foreground">
                    No reviews published yet.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Check back soon — client reviews will appear here as they're verified.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {reviews.map((review) => (
                    <article key={review.id} className="glass-card rounded-[28px] p-6 sm:p-7">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1 text-primary">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={`${review.id}-star-${i}`} className="size-4 fill-current" />
                          ))}
                        </div>
                        <Quote className="size-5 text-muted-foreground" />
                      </div>

                      <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
                        {review.title}
                      </h2>
                      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                        “{review.content}”
                      </p>

                      <div className="mt-6 border-t border-border pt-4">
                        <p className="font-display text-base font-semibold text-foreground">
                          {review.authorName}
                        </p>
                        <p className="mt-1 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                          {review.projectRef
                            ? review.projectRef.replace(/-/g, " ")
                            : "Client review"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <ReviewForm />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
