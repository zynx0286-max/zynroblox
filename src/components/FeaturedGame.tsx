import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SectionHead } from "@/components/bits/SectionHead";
import { Magnetic } from "@/components/Magnetic";
import { resolveAsset } from "@/lib/assets";
import { safeExternalUrl } from "@/lib/url";
import type { Work } from "@/data/works";
import type { FeaturedSettings } from "@/lib/site-settings";

export function FeaturedGame({ works, settings }: { works: Work[]; settings: FeaturedSettings }) {
  // The admin panel's "Featured" checkbox decides. (The old hardcoded slug
  // overrode it, so ticking Featured on another game did nothing publicly.)
  const featured = works.find((w) => w.featured) ?? works[0];
  if (!featured) return null;
  const externalHref = safeExternalUrl(featured.href);

  return (
    <section id="featured" className="border-t border-border">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-[clamp(4.5rem,8vw,8rem)] sm:px-6 lg:px-10">
        <SectionHead
          index="02"
          label="Featured project"
          aside={
            <span className="font-mono text-[0.6rem] tracking-[0.14em] text-muted-foreground/70 uppercase">
              {featured.category}
            </span>
          }
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-12">
          <Link
            to="/work/$slug"
            params={{ slug: featured.slug }}
            data-cursor-label="VIEW"
            className="group relative block aspect-square overflow-hidden rounded-[26px] border border-border bg-surface"
          >
            {featured.image ? (
              <img
                src={resolveAsset(featured.image)}
                alt={`${featured.title} screenshot`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
              />
            ) : (
              <div aria-hidden className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_28%,rgba(39,100,255,0.42),transparent_65%)]" />
                <div
                  className="absolute inset-0 opacity-[0.14]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                    backgroundSize: "56px 56px",
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-display text-[clamp(7rem,16vw,13rem)] font-black tracking-[-0.08em] text-white/[0.07]">
                  {featured.title
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w.charAt(0).toUpperCase())
                    .join("")}
                </span>
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent"
            />
            <span className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-background/60 px-3 py-1.5 font-mono text-[0.58rem] tracking-[0.16em] text-foreground uppercase backdrop-blur-sm">
              <span className="zyn-live-dot" aria-hidden />
              {settings.badge}
            </span>
            <span className="absolute top-5 right-5 grid size-10 place-items-center rounded-full border border-white/20 bg-background/50 text-foreground backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="size-4" />
            </span>
            <span className="absolute bottom-5 left-5 font-mono text-[0.6rem] tracking-[0.16em] text-foreground/70 uppercase">
              {featured.role}
            </span>
          </Link>

          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.16em] text-primary uppercase">
              {settings.badge} · {featured.role}
            </p>
            <h2 className="mt-4 max-w-[16ch] font-display text-[clamp(2rem,4vw,3.6rem)] leading-[0.96] font-black tracking-[-0.05em]">
              {featured.title}
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {featured.description}
            </p>

            {featured.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {featured.tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 font-mono text-[0.58rem] tracking-[0.08em] text-muted-foreground uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-8 border-t border-border">
              {settings.creators.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between gap-4 border-b border-border py-3"
                >
                  <span className="font-display text-sm font-semibold">{c.name}</span>
                  <span className="font-mono text-[0.62rem] tracking-[0.08em] text-muted-foreground uppercase">
                    {c.subs}
                  </span>
                </div>
              ))}
              <p className="mt-3 font-mono text-[0.58rem] tracking-[0.08em] text-muted-foreground/70 uppercase">
                {settings.creatorNote}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Magnetic strength={7}>
                <Link
                  to="/work/$slug"
                  params={{ slug: featured.slug }}
                  className="group inline-flex items-center gap-2 font-display text-[0.7rem] font-bold tracking-[0.12em] text-foreground uppercase"
                >
                  View case study
                  <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
              {externalHref ? (
                <a
                  href={externalHref}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 font-display text-[0.7rem] font-bold tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                >
                  {featured.linkLabel ?? "Open project"}
                  <ArrowUpRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
