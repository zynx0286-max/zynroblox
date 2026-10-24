import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useState } from "react";
import { ArrowUpRight, BadgeCheck, Pause, Play } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SITE_URL } from "@/data/works";
import { DEVELOPERS, type Developer } from "@/data/developers";

const PAGE_TITLE = "The Biggest Developers I've Worked With — ZYN";
const PAGE_DESC =
  "Meet Fondatix, synpletic and prayaIot — Roblox developers, builders and studio leads behind some of the platform's biggest experiences.";

const DeveloperStage = lazy(() => import("@/components/developers/DeveloperStage"));

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/developers` },
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/developers` }],
  }),
  component: DevelopersPage,
});

function DevelopersPage() {
  const [sceneReady, setSceneReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const handleReady = useCallback(() => setSceneReady(true), []);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <PageHero
          index="06"
          label="Collaborators"
          ghost="Roster"
          aside={<span>03 / Public profiles</span>}
          title={
            <>
              The biggest <span className="text-primary">developers</span> I&apos;ve worked with.
            </>
          }
          copy="Three builders behind some of Roblox's largest experiences. Their public work speaks for itself — and I've been lucky enough to build alongside them."
          meta={[
            { label: "Roster", value: "03" },
            { label: "Verified", value: "02" },
            { label: "Earliest join", value: "2013" },
            { label: "Platform", value: "Roblox" },
          ]}
        />

        <section className="relative overflow-hidden border-b border-border bg-[#05060a]">
          <div className="relative h-[clamp(26rem,62svh,45rem)] w-full">
            <Suspense fallback={<StageFallback />}>
              <DeveloperStage onReady={handleReady} paused={paused} />
            </Suspense>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(5,6,10,0.62)_100%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[#05060a] to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[#05060a] to-transparent"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 sm:p-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[0.5rem] tracking-[0.18em] text-white/60 uppercase backdrop-blur-md">
                <span
                  className={`size-1.5 rounded-full ${
                    sceneReady ? "bg-primary" : "animate-pulse bg-white/40"
                  }`}
                />
                {sceneReady ? "Live stage" : "Opening stage"}
              </span>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="font-mono text-[0.5rem] tracking-[0.18em] text-white/45 uppercase">
                    {paused ? "Rotation paused" : "Auto rotation"}
                  </p>
                  <p className="mt-1 font-mono text-[0.46rem] tracking-[0.16em] text-white/25 uppercase">
                    Drag to spin
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={paused ? "Resume auto rotation" : "Pause auto rotation"}
                  aria-pressed={paused}
                  onClick={() => setPaused((value) => !value)}
                  className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/70 backdrop-blur-md transition-colors hover:border-primary/60 hover:text-white"
                >
                  {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-4 sm:p-6">
              <p className="font-mono text-[0.48rem] tracking-[0.2em] text-white/30 uppercase">
                Roster / 03
              </p>
              <p className="hidden font-mono text-[0.46rem] tracking-[0.16em] text-white/25 uppercase sm:block">
                Fondatix · synpletic · prayaIot
              </p>
            </div>

            <p className="sr-only">
              An auto-rotating 3D stage with holographic panels for Fondatix, synpletic and
              prayaIot. Their full profiles, credits and Roblox links are listed below.
            </p>
          </div>

          <div className="relative z-10 border-t border-white/10 bg-[#05060a]">
            <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-5 sm:px-6 lg:px-10">
              <span className="font-mono text-[0.52rem] tracking-[0.18em] text-primary uppercase">
                Roster
              </span>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {DEVELOPERS.map((dev) => (
                  <a
                    key={dev.id}
                    href={dev.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 font-mono text-[0.56rem] tracking-[0.12em] text-white/40 uppercase transition-colors hover:text-white"
                  >
                    <span aria-hidden className="size-1 rounded-full bg-primary/70" />
                    {dev.username}
                    <span className="hidden text-white/20 transition-colors group-hover:text-white/40 sm:inline">
                      / {dev.role}
                    </span>
                  </a>
                ))}
              </div>
              <span className="ml-auto hidden font-mono text-[0.46rem] tracking-[0.18em] text-white/20 uppercase lg:block">
                Auto-rotating / 2026
              </span>
            </div>
          </div>
        </section>

        <Reveal as="section" className="border-b border-border">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[0.58rem] tracking-[0.18em] text-muted-foreground uppercase">
                  <span className="text-primary">02</span> / The detail
                </p>
                <h2 className="mt-4 max-w-[16ch] font-display text-[clamp(2rem,4.4vw,3.8rem)] leading-[0.92] font-black tracking-[-0.055em]">
                  Who they are. What they build.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Public profile details and credited work. Open any card to visit their Roblox
                profile directly.
              </p>
            </div>

            <div className="mt-10 grid gap-px overflow-hidden rounded-[20px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {DEVELOPERS.map((dev, index) => (
                <DeveloperCard
                  key={dev.id}
                  dev={dev}
                  index={index}
                  className={index === 2 ? "sm:col-span-2 lg:col-span-1" : undefined}
                />
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl font-mono text-[0.55rem] leading-relaxed tracking-[0.1em] text-muted-foreground/55 uppercase">
                Public profile details and credited work, last checked October 2026. Avatar
                thumbnails courtesy of Roblox.
              </p>
              <Link
                to="/profile"
                className="group inline-flex items-center gap-2 font-mono text-[0.56rem] tracking-[0.14em] text-primary uppercase transition-colors hover:text-foreground"
              >
                Visit my 3D profile
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}

function DeveloperCard({
  dev,
  index,
  className,
}: {
  dev: Developer;
  index: number;
  className?: string | undefined;
}) {
  return (
    <a
      href={dev.profileUrl}
      target="_blank"
      rel="noreferrer"
      className={`group relative flex h-full flex-col bg-background p-5 transition-colors hover:bg-surface/45 sm:p-7 ${className ?? ""}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-colors duration-500 group-hover:via-primary/70"
      />

      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[0.6rem] tracking-[0.18em] text-primary/80">
          0{index + 1}
        </span>
        <span className="font-mono text-[0.5rem] tracking-[0.16em] text-muted-foreground/55 uppercase">
          Since {dev.joined}
        </span>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface sm:size-[4.5rem]">
          <img
            src={dev.headshot}
            alt={`${dev.username}'s Roblox avatar`}
            loading="lazy"
            className="size-full object-cover grayscale transition-[filter] duration-500 group-hover:grayscale-0"
          />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-xl leading-none font-black tracking-[-0.04em] sm:text-2xl">
              {dev.username}
            </h3>
            {dev.verified ? (
              <BadgeCheck
                aria-label="Verified Roblox account"
                className="size-4 shrink-0 text-primary sm:size-[1.1rem]"
              />
            ) : null}
          </div>
          <p className="mt-2 font-mono text-[0.54rem] tracking-[0.12em] text-muted-foreground/60 uppercase">
            @{dev.username}
            {dev.displayName !== dev.username ? ` · ${dev.displayName}` : ""}
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{dev.blurb}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
        <div>
          <dt className="font-mono text-[0.5rem] tracking-[0.16em] text-muted-foreground/55 uppercase">
            Role
          </dt>
          <dd className="mt-1.5 text-xs leading-snug font-medium text-foreground">{dev.role}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.5rem] tracking-[0.16em] text-muted-foreground/55 uppercase">
            Studio
          </dt>
          <dd className="mt-1.5 text-xs leading-snug font-medium text-foreground">{dev.studio}</dd>
        </div>
      </dl>

      <ul className="mt-5 flex flex-wrap gap-1.5">
        {dev.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-border bg-surface/60 px-2.5 py-1 font-mono text-[0.48rem] tracking-[0.12em] text-muted-foreground uppercase"
          >
            {tag}
          </li>
        ))}
      </ul>

      <span className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-5 font-mono text-[0.54rem] tracking-[0.14em] text-muted-foreground uppercase transition-colors group-hover:text-foreground">
        Open Roblox profile
        <ArrowUpRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </a>
  );
}

function StageFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#05060a]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(54,84,190,0.18),transparent_55%)]"
      />
      <div aria-hidden className="relative flex items-end gap-2 opacity-45 sm:gap-10">
        {DEVELOPERS.map((dev, index) => (
          <img
            key={dev.id}
            src={dev.avatar}
            alt=""
            className={`h-28 w-auto object-contain drop-shadow-[0_0_30px_rgba(70,105,255,0.25)] sm:h-48 lg:h-64 ${
              index === 1 ? "sm:h-56 lg:h-72" : ""
            }`}
          />
        ))}
      </div>
      <p className="absolute bottom-5 font-mono text-[0.5rem] tracking-[0.2em] text-white/30 uppercase">
        Opening the stage
      </p>
    </div>
  );
}
