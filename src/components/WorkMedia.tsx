import { Film, Maximize2 } from "lucide-react";
import type { WorkMedia as WorkMediaType } from "@/lib/site.functions";
import { ProtectedAudio } from "@/components/ProtectedAudio";
import { SfxProtectionNotice } from "@/components/SfxProtectionNotice";
import { isSafeMediaUrl } from "@/lib/media";

export function WorkMedia({
  media,
  onOpenImage,
}: {
  media: WorkMediaType[];
  /** Opens the in-app viewer at this URL. The route owns the image list. */
  onOpenImage?: (url: string) => void;
}) {
  if (media.length === 0) return null;

  // Only render entries whose URL is genuinely safe (https, /uploads/ or an
  // inline media data URL). Anything else is skipped entirely.
  const safeMedia = media.filter((m) => isSafeMediaUrl(m.url));

  const images = safeMedia.filter((m) => m.mediaType === "image");
  const audio = safeMedia.filter((m) => m.mediaType === "audio");
  const videos = safeMedia.filter((m) => m.mediaType === "video");

  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
          <div>
            <p className="font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
              <span className="text-primary">Media</span> / proof
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              Screenshots, audio &amp; clips.
            </h2>
          </div>
          <p className="font-mono text-[0.56rem] tracking-[0.12em] text-muted-foreground/60 uppercase">
            {String(safeMedia.length).padStart(2, "0")} assets
          </p>
        </div>

        {images.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((m) => (
              <figure
                key={m.id}
                className="group relative aspect-[4/3] overflow-hidden rounded-[20px] border border-border bg-surface"
              >
                <button
                  type="button"
                  onClick={() => onOpenImage?.(m.url)}
                  data-cursor-label="EXPAND"
                  aria-label={`Open ${m.caption || "screenshot"} full size`}
                  className="block h-full w-full cursor-zoom-in text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none"
                >
                  <img
                    src={m.url}
                    alt={m.caption || "Work screenshot"}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full border border-white/15 bg-background/60 text-foreground/80 backdrop-blur-sm transition-colors group-hover:border-primary group-hover:text-primary">
                    <Maximize2 className="size-3.5" aria-hidden />
                  </span>
                  <span className="absolute right-3 bottom-3 left-3 inline-flex items-center gap-1.5 truncate rounded-full border border-white/15 bg-background/75 px-2.5 py-1 font-mono text-[0.52rem] tracking-[0.06em] text-foreground/90 uppercase backdrop-blur">
                    {m.caption || "Screenshot"}
                  </span>
                </button>
              </figure>
            ))}
          </div>
        ) : null}

        {audio.length ? (
          <div className="mt-8 space-y-2.5">
            {/* Above the players on purpose: packs run to 100+ samples, so a
                notice after the list would sit ~13,000px down and never be read. */}
            <SfxProtectionNotice compact />
            {audio.map((m) => (
              <ProtectedAudio key={m.id} media={m} />
            ))}
          </div>
        ) : null}

        {videos.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {videos.map((m) => (
              <figure
                key={m.id}
                className="overflow-hidden rounded-[20px] border border-border bg-surface"
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
      </div>
    </section>
  );
}
