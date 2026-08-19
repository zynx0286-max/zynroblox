import { FileAudio, Film, Image as ImageIcon } from "lucide-react";
import type { WorkMedia as WorkMediaType } from "@/lib/site.functions";
import { cn } from "@/lib/utils";

export function WorkMedia({ media }: { media: WorkMediaType[] }) {
  if (media.length === 0) return null;

  const images = media.filter((m) => m.mediaType === "image");
  const audio = media.filter((m) => m.mediaType === "audio");
  const videos = media.filter((m) => m.mediaType === "video");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[0.7rem] tracking-[0.3em] text-primary uppercase">
            Media
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            Screenshots, audio & clips
          </h2>
        </div>
      </div>

      {images.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((m) => (
            <figure
              key={m.id}
              className="group overflow-hidden rounded-2xl border border-border bg-surface/50"
            >
              <a href={m.url} target="_blank" rel="noreferrer" className="block">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={m.url}
                    alt={m.caption || "Work screenshot"}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <span className="absolute right-3 bottom-3 rounded-full bg-background/80 px-2.5 py-1 text-[0.65rem] text-muted-foreground backdrop-blur">
                    <ImageIcon className="mr-1 inline size-3" />
                    {m.caption || "Screenshot"}
                  </span>
                </div>
              </a>
            </figure>
          ))}
        </div>
      ) : null}

      {audio.length ? (
        <div className="mt-8 space-y-3">
          {audio.map((m) => (
            <div
              key={m.id}
              className="glass flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <FileAudio className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold">
                    {m.caption || "Audio clip"}
                  </p>
                  <p className="text-xs text-muted-foreground">SFX / audio preview</p>
                </div>
              </div>
              <audio controls preload="metadata" className={cn("h-11 w-full sm:w-72")} src={m.url}>
                Your browser doesn&apos;t support audio.
              </audio>
            </div>
          ))}
        </div>
      ) : null}

      {videos.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {videos.map((m) => (
            <figure
              key={m.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface/50"
            >
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Film className="size-4 text-primary" />
                <figcaption className="truncate font-display text-sm font-semibold">
                  {m.caption || "Video clip"}
                </figcaption>
              </div>
              <video controls preload="metadata" className="aspect-video w-full bg-black/40">
                <source src={m.url} />
                Your browser doesn&apos;t support video.
              </video>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}
