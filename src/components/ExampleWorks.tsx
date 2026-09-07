import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink, Gamepad2 } from "lucide-react";
import { GlassImage } from "@/components/GlassFrame";
import type { ExampleWorksSettings } from "@/lib/site-settings";

export function ExampleWorks({ settings }: { settings: ExampleWorksSettings }) {
  if (settings.items.length === 0) return null;

  return (
    <section id="example-works" className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
          {settings.heading}
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          {settings.sub}
        </h2>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {settings.items.map((item) => (
          <article
            key={item.title}
            className="group glass-card relative flex flex-col rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
          >
            <GlassImage
              src={item.image}
              alt={`${item.title} thumbnail`}
              ratio="aspect-[16/10]"
            />

            <div className="mt-4 flex-1">
              <p className="font-display text-[0.65rem] tracking-[0.25em] text-primary uppercase">
                Example Work
              </p>
              <h3 className="mt-2 font-display text-base font-semibold sm:text-lg">{item.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[0.6rem] text-muted-foreground sm:px-3 sm:text-[0.65rem]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              {(item.href || item.image) ? (
                <a
                  href={item.href || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-display text-xs text-primary transition-colors hover:bg-primary/20"
                >
                  {item.href?.includes("/games/") ? (
                    <Gamepad2 className="size-3.5" />
                  ) : (
                    <ExternalLink className="size-3.5" />
                  )}
                  {item.href ? "View on Roblox" : "View Image"}
                  <ArrowUpRight className="size-3.5" />
                </a>
              ) : (
                <span />
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}