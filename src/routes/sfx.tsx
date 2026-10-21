import { createFileRoute, Link } from "@tanstack/react-router";
import { AudioLines, ChevronRight, Headphones } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { SfxProtectionNotice } from "@/components/SfxProtectionNotice";
import { SITE_URL } from "@/data/works";
import { getPublicWorks } from "@/lib/public-data";
import { getPublicMedia } from "@/lib/public-data";

const PAGE_TITLE = "SFX Work — Roblox Sound Packs | ZYN";
const PAGE_DESC =
  "Every sound pack ZYN has produced for Roblox games — weapons, combat, UI, ambience, abilities, movement, stingers and creature voices. Preview the samples right on the site.";

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
        <section className="relative overflow-hidden pt-32 pb-8 sm:pt-44 sm:pb-10">
          <div className="hero-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
              SFX Work
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
              Every sound, ready to hear.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {totalSamples} original Roblox sound effects across {packs.length} packs — weapons,
              combat, UI, ambience, abilities, movement, stingers and creature voices. Hit play on
              any sample without leaving the site.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">
              <Headphones className="size-3.5 text-primary" />
              All samples are original work — preview loaded from the archive
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
            {packs.map((pack, i) => (
              <Reveal key={pack.slug} delay={(i % 2) * 70}>
                <Link
                  to="/work/$slug"
                  params={{ slug: pack.slug }}
                  className="glass-card group flex h-full flex-col gap-3 rounded-2xl p-6 transition-transform hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between">
                    <span className="glass flex size-10 items-center justify-center rounded-xl text-primary">
                      <AudioLines className="size-5" />
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      {pack.audioCount} samples
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-bold">{pack.title}</h2>
                  <p className="text-sm text-muted-foreground line-clamp-3">{pack.description}</p>
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <div className="flex flex-wrap gap-2">
                      {pack.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-secondary/40 px-2.5 py-1 text-[11px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <SfxProtectionNotice />
      </main>

      <SiteFooter />
    </div>
  );
}
