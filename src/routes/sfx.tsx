import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, AudioLines, Headphones, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { Reveal } from "@/components/Reveal";
import { SfxProtectionNotice } from "@/components/SfxProtectionNotice";
import { SITE_URL } from "@/data/works";
import { getPublicWorks } from "@/lib/public-data";
import { getPublicMedia } from "@/lib/public-data";

const PAGE_TITLE = "SFX Work — Roblox Sound Packs | ZYN";
const PAGE_DESC =
  "Every sound pack ZYN has produced for Roblox games — weapons, combat, UI, ambience, abilities, movement, stingers and creature voices. Preview the samples right on the site.";

const WAVE = [32, 58, 41, 82, 54, 96, 38, 68, 47, 88, 61, 35, 74, 49] as const;

export const Route = createFileRoute("/sfx")({
  loader: async () => {
    const [works, media] = await Promise.all([getPublicWorks(), getPublicMedia()]);
    return {
      packs: works
        .filter((w) => w.category === "SFX / Audio")
        .map((w) => ({
          ...w,
          audioCount: media.filter((m) => m.workId === w.id && m.mediaType === "audio").length,
        })),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/sfx` },
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/sfx` }],
  }),
  component: SfxPage,
});

function SfxPage() {
  const { packs } = Route.useLoaderData();
  const totalSamples = packs.reduce((n, p) => n + p.audioCount, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="05"
          label="SFX archive"
          ghost="Sound"
          title={
            <>
              Every sound, <span className="text-primary">ready to hear.</span>
            </>
          }
          copy={`${totalSamples} original Roblox sound effects across ${packs.length} packs — weapons, combat, UI, ambience, abilities, movement, stingers and creature voices. Hit play on any sample without leaving the site.`}
          aside={<>Protected previews · original work</>}
          meta={[
            { label: "Samples", value: String(totalSamples) },
            { label: "Packs", value: String(packs.length).padStart(2, "0") },
            { label: "Source", value: "100% original" },
            { label: "Delivery", value: "Game-ready" },
          ]}
        />

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
              <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                <span className="text-primary">Pack</span> index
              </p>
              <p className="flex items-center gap-2 font-mono text-[0.56rem] tracking-[0.12em] text-muted-foreground/60 uppercase">
                <Headphones className="size-3.5 text-primary" />
                Preview in browser
              </p>
            </div>

            {packs.length === 0 ? (
              <div className="editorial-card mt-8 p-8 text-center">
                <p className="font-display text-xl font-bold">Sound packs are loading soon.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check the work archive for the latest projects in the meantime.
                </p>
                <Link
                  to="/work"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-[0.66rem] font-bold tracking-[0.1em] text-primary-foreground uppercase"
                >
                  Browse work <ArrowUpRight className="size-4" />
                </Link>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {packs.map((pack, i) => (
                  <Reveal key={pack.slug} delay={(i % 2) * 70}>
                    <Link
                      to="/work/$slug"
                      params={{ slug: pack.slug }}
                      data-cursor-label="LISTEN"
                      className="group block h-full"
                    >
                      <article className="editorial-card flex h-full flex-col p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/50 sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                          <span className="font-mono text-[0.6rem] tracking-[0.16em] text-primary">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[0.52rem] tracking-[0.08em] text-muted-foreground uppercase">
                            <AudioLines className="size-3 text-primary" />
                            {pack.audioCount} samples
                          </span>
                        </div>

                        <h2 className="mt-9 max-w-[20ch] font-display text-2xl leading-[1.02] font-bold tracking-[-0.045em] sm:text-3xl">
                          {pack.title}
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                          {pack.description}
                        </p>

                        <div
                          aria-hidden
                          className="mt-8 flex h-10 items-end gap-[3px] overflow-hidden border-b border-border pb-3"
                        >
                          {WAVE.map((height, bar) => (
                            <span
                              key={bar}
                              className="block w-[3px] shrink-0 rounded-full bg-primary/35 transition-colors duration-300 group-hover:bg-primary/70"
                              style={{ height: `${height}%` }}
                            />
                          ))}
                          <span className="ml-auto font-mono text-[0.5rem] tracking-[0.12em] text-muted-foreground/60 uppercase">
                            Audio pack
                          </span>
                        </div>

                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                          <div className="flex flex-wrap gap-1.5">
                            {pack.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-border px-2.5 py-1 font-mono text-[0.5rem] tracking-[0.06em] text-muted-foreground uppercase"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-1.5 font-display text-[0.66rem] font-bold tracking-[0.1em] text-foreground uppercase transition-colors group-hover:text-primary">
                            Open pack
                            <ArrowUpRight className="size-3.5 text-primary transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </div>
                      </article>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5 font-mono text-[0.54rem] tracking-[0.1em] text-muted-foreground/60 uppercase">
              <ShieldCheck className="size-3.5 text-primary" />
              All samples stream as protected, watermarked previews
            </div>
          </div>
        </section>

        <SfxProtectionNotice />

        <PageCta
          kicker="Need a custom set?"
          title="Your game deserves its own sound."
          copy="A pack built around your mechanics, UI and pacing — not a folder of stock effects with the names changed."
          secondary={
            <Link
              to="/services/$slug"
              params={{ slug: "sfx" }}
              className="inline-flex items-center gap-2 border-b border-border pb-1 font-mono text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-foreground"
            >
              Sound design scope
              <ArrowUpRight className="size-3.5 text-primary" />
            </Link>
          }
        />
      </main>
      <SiteFooter />
    </div>
  );
}
