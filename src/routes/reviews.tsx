import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewWall } from "@/components/ReviewWall";
import { getPublicReviews, getPublicSettings } from "@/lib/public-data";
import { SITE_URL } from "@/data/works";

export const Route = createFileRoute("/reviews")({
  loader: async () => {
    const [reviews, settings] = await Promise.all([getPublicReviews(), getPublicSettings()]);
    return { reviews, settings };
  },
  head: () => ({
    meta: [
      { title: "Reviews — ZYN" },
      {
        name: "description",
        content:
          "Read client testimonials for ZYN's Roblox SFX, QA testing, community management and game research work.",
      },
      { property: "og:title", content: "Reviews — ZYN" },
      {
        property: "og:description",
        content:
          "Read client testimonials for ZYN's Roblox SFX, QA testing, community management and game research work.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/reviews` },
      { property: "og:image", content: `${SITE_URL}/favicon.png` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/reviews` }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { reviews, settings } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              Reviews
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Feedback from clients and teams.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              Client testimonials and community reviews in one place — write one below and it
              appears instantly for everyone.
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

        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl">
            <ReviewForm />
          </div>
        </div>

        <ReviewWall testimonials={settings.testimonials} reviews={reviews} />
      </main>
      <SiteFooter />
    </div>
  );
}
