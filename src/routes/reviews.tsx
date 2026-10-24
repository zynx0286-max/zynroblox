import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, MessageSquare, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
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
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/reviews` }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { reviews, settings } = Route.useLoaderData();

  const curated = settings.testimonials.items.length;
  const total = curated + reviews.length;
  const ratingCount = reviews.length + curated;
  const average = ratingCount
    ? ((reviews.reduce((sum, r) => sum + r.rating, 0) + curated * 5) / ratingCount).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="03"
          label="Reviews"
          ghost="Trust"
          title={
            <>
              Feedback from <span className="text-primary">clients</span> and teams.
            </>
          }
          copy="Curated client testimonials and public community reviews in one place. Read what working together actually looked like — then add your own below."
          aside={
            <Link
              to="/"
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back home
            </Link>
          }
          meta={[
            { label: "Total", value: String(total).padStart(2, "0") },
            { label: "Average rating", value: `${average} / 5` },
            { label: "Verified clients", value: String(curated).padStart(2, "0") },
            { label: "Community", value: String(reviews.length).padStart(2, "0") },
          ]}
        />

        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-[1500px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-10 lg:py-24">
            <div>
              <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                <span className="text-primary">Add</span> your voice
              </p>
              <h2 className="mt-6 max-w-[12ch] font-display text-[clamp(2rem,4.2vw,3.6rem)] leading-[0.94] font-black tracking-[-0.055em]">
                Tell the next team what to expect.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                No account, no follow-up form. One honest review per device, published as soon as it
                lands.
              </p>

              <ul className="mt-8 space-y-4 border-t border-border pt-6">
                {[
                  { icon: BadgeCheck, text: "Shows instantly in the wall below" },
                  { icon: ShieldCheck, text: "One review per device, checked server-side" },
                  { icon: MessageSquare, text: "Need an edit later? Message @acczyn" },
                ].map((item) => (
                  <li
                    key={item.text}
                    className="flex items-start gap-3 font-mono text-[0.58rem] leading-relaxed tracking-[0.05em] text-muted-foreground uppercase"
                  >
                    <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <ReviewForm />
          </div>
        </section>

        <ReviewWall testimonials={settings.testimonials} reviews={reviews} bare />

        <PageCta
          kicker="Want a result worth reviewing?"
          title="Bring the next game."
          copy="Sound, QA or community — the first step is the same: a game link and an honest description of what needs fixing."
          secondary={
            <Link
              to="/services"
              className="inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
            >
              See services
              <span aria-hidden>→</span>
            </Link>
          }
        />
      </main>
      <SiteFooter />
    </div>
  );
}
